import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

export type GameType = 'checkers' | 'chess' | 'domino' | 'battleship' | 'uno' | 'cacheta';

export interface Player {
    id: string;
    name: string;
    avatar: string;
    isBot: boolean;
    isSpectator: boolean;
    isEliminated: boolean;
    timeRemaining: number;
    profileId?: string;
}

export interface Match {
    id: string;
    player1: Player | null;
    player2: Player | null;
    winner: Player | null;
    round: 'quarters' | 'semis' | 'final';
    status: 'waiting' | 'playing' | 'finished';
    dbId?: string;
}

export interface TournamentState {
    gameType: GameType | null;
    phase: 'selection' | 'radar' | 'playing' | 'finished';
    round: 'waiting' | 'quarters' | 'semis' | 'final' | 'champion';
    players: Player[];
    matches: Match[];
    currentMatch: Match | null;
    currentPlayer: Player | null;
    champion: Player | null;
    spectatorMode: boolean;
    spectatorValid: boolean;
    roomId: string | null;
    isOnline: boolean;
}

interface TournamentContextType {
    state: TournamentState;
    selectGame: (game: GameType) => void;
    startTournament: () => void;
    reportMatchResult: (matchId: string, winnerId: string) => void;
    setSpectatorMode: (val: boolean) => void;
    resetTournament: () => void;
    invalidateSpectator: () => void;
    currentPlayerObj: Player;
    sendMove: (matchId: string, moveData: any) => Promise<void>;
}

const generateBotName = (index: number): string => {
    const names = ['Falcon', 'Shadow', 'Phoenix', 'Viper', 'Thunder', 'Storm', 'Blaze', 'Raptor', 'Ghost', 'Nitro'];
    return `Bot_${names[index % names.length]}`;
};

const generateAvatar = (index: number): string => {
    const avatars = ['🔴', '🔵', '🟢', '🟡', '🟣', '🟠', '⚪'];
    return avatars[index % avatars.length];
};

const createBots = (count: number, startIdx: number): Player[] =>
    Array.from({ length: count }, (_, i) => ({
        id: `bot-${Date.now()}-${startIdx + i}`,
        name: generateBotName(startIdx + i),
        avatar: generateAvatar(startIdx + i),
        isBot: true,
        isSpectator: false,
        isEliminated: false,
        timeRemaining: 300,
    }));

const initialState: TournamentState = {
    gameType: null,
    phase: 'selection',
    round: 'waiting',
    players: [],
    matches: [],
    currentMatch: null,
    currentPlayer: null,
    champion: null,
    spectatorMode: false,
    spectatorValid: false,
    roomId: null,
    isOnline: false,
};

const createMatches = (players: Player[], round: 'quarters' | 'semis' | 'final'): Match[] => {
    const matches: Match[] = [];
    for (let i = 0; i < players.length; i += 2) {
        matches.push({
            id: `${round}-${i / 2}-${Date.now()}`,
            player1: players[i] || null,
            player2: players[i + 1] || null,
            winner: null,
            round,
            status: 'waiting',
        });
    }
    return matches;
};

const TournamentContext = createContext<TournamentContextType | null>(null);

export const useTournament = () => {
    const ctx = useContext(TournamentContext);
    if (!ctx) throw new Error('useTournament must be used within TournamentProvider');
    return ctx;
};

export const TournamentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { profile, user } = useAuth();
    const [state, setState] = useState<TournamentState>(initialState);
    const botMatchTimersRef = useRef<NodeJS.Timeout[]>([]);
    const channelRef = useRef<RealtimeChannel | null>(null);
    const loadingRef = useRef(false);

    const CURRENT_PLAYER: Player = useMemo(() => ({
        id: user?.id || profile?.user_id || 'player-1',
        name: profile?.username || user?.email?.split('@')[0] || 'Você',
        avatar: profile?.avatar || '⭐',
        isBot: false,
        isSpectator: false,
        isEliminated: false,
        timeRemaining: 300,
        profileId: profile?.id,
    }), [user?.id, user?.email, profile?.id, profile?.user_id, profile?.username, profile?.avatar]);

    const clearBotTimers = () => {
        botMatchTimersRef.current.forEach(t => clearTimeout(t));
        botMatchTimersRef.current = [];
    };

    // Join or create a room atomically via edge function
    const joinOrCreateRoom = async (game: GameType) => {
        if (!user) return null;
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData?.session?.access_token;
            const response = await supabase.functions.invoke('matchmaking', {
                body: { game_type: game },
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (response.error) { console.error('Matchmaking error:', response.error); return null; }
            const { room_id } = response.data;
            return room_id || null;
        } catch (err) { console.error('Matchmaking failed:', err); return null; }
    };

    // Build a Player from a profile row + tournament_player row
    const buildPlayer = (tp: any): Player => ({
        id: tp.profiles?.user_id || tp.profile_id,
        name: tp.profiles?.username || 'Jogador',
        avatar: tp.profiles?.avatar || '⭐',
        isBot: false,
        isSpectator: tp.is_eliminated,
        isEliminated: tp.is_eliminated,
        timeRemaining: 300,
        profileId: tp.profile_id,
    });

    // Map a DB match to a local Match using the players map
    const mapDbMatch = (dbMatch: any, playersMap: Map<string, Player>): Match => {
        const p1 = dbMatch.player1_id ? playersMap.get(dbMatch.player1_id) || null : null;
        const p2 = dbMatch.player2_id ? playersMap.get(dbMatch.player2_id) || null : null;
        const winner = dbMatch.winner_id ? playersMap.get(dbMatch.winner_id) || null : null;
        return {
            id: `${dbMatch.round}-${dbMatch.match_index}-db`,
            dbId: dbMatch.id,
            player1: p1,
            player2: p2,
            winner,
            round: dbMatch.round,
            status: dbMatch.status,
        };
    };

    // Load full room state from DB and sync to local state
    const loadRoomState = async (roomId: string) => {
        if (loadingRef.current) return;
        loadingRef.current = true;
        try {
            const [roomRes, playersRes, matchesRes] = await Promise.all([
                supabase.from('tournament_rooms').select('*').eq('id', roomId).maybeSingle(),
                supabase.from('tournament_players').select('*, profiles(*)').eq('room_id', roomId),
                supabase.from('tournament_matches').select('*').eq('room_id', roomId).order('created_at', { ascending: true }),
            ]);

            const room = roomRes.data;
            if (!room) return;

            const dbPlayers = playersRes.data || [];
            const dbMatches = matchesRes.data || [];

            // Build players map (profileId → Player)
            const mappedPlayers: Player[] = dbPlayers.map(buildPlayer);
            const playersMap = new Map<string, Player>();
            dbPlayers.forEach((tp: any) => {
                const player = buildPlayer(tp);
                playersMap.set(tp.profile_id, player);
            });

            // Map all DB matches
            const mappedMatches: Match[] = dbMatches.map((m: any) => mapDbMatch(m, playersMap));

            // Determine round
            let round: TournamentState['round'] = 'waiting';
            if (room.status === 'finished') {
                round = 'champion';
            } else if (room.current_round) {
                round = room.current_round;
            }

            // Find current player's active match
            const currentProfileId = profile?.id;
            const playerActiveMatch = currentProfileId
                ? mappedMatches.find(m =>
                    m.status === 'playing' &&
                    (m.player1?.profileId === currentProfileId || m.player2?.profileId === currentProfileId)
                )
                : null;

            // Determine if player is eliminated
            const playerTp = currentProfileId
                ? dbPlayers.find((tp: any) => tp.profile_id === currentProfileId)
                : null;
            const playerEliminated = playerTp?.is_eliminated || false;

            // Check if player has a finished match in current round but no active one
            const playerFinishedInRound = currentProfileId
                ? mappedMatches.find(m =>
                    m.round === room.current_round &&
                    m.status === 'finished' &&
                    (m.player1?.profileId === currentProfileId || m.player2?.profileId === currentProfileId)
                )
                : null;
            const playerWonInRound = playerFinishedInRound?.winner?.profileId === currentProfileId;

            // Determine phase
            let phase: TournamentState['phase'] = 'radar';
            if (playerActiveMatch) {
                phase = 'playing';
            }

            // Champion
            const champion = room.champion_id ? playersMap.get(room.champion_id) || null : null;

            // Spectator mode
            const isSpectator = playerEliminated || (
                round !== 'waiting' && round !== 'champion' &&
                !playerActiveMatch && !playerWonInRound
            );

            setState(prev => ({
                ...prev,
                gameType: prev.gameType || room.game_type,
                players: mappedPlayers,
                matches: mappedMatches,
                round,
                phase,
                currentMatch: playerActiveMatch || null,
                currentPlayer: CURRENT_PLAYER,
                champion,
                spectatorMode: isSpectator,
                spectatorValid: true,
                roomId,
                isOnline: true,
            }));
        } finally {
            loadingRef.current = false;
        }
    };

    // Subscribe to room updates via Postgres realtime
    const subscribeToRoom = (roomId: string) => {
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
        }

        const channel = supabase
            .channel(`room-${roomId}`)
            .on('postgres_changes', {
                event: '*', schema: 'public', table: 'tournament_players',
                filter: `room_id=eq.${roomId}`,
            }, () => { loadRoomState(roomId); })
            .on('postgres_changes', {
                event: '*', schema: 'public', table: 'tournament_matches',
                filter: `room_id=eq.${roomId}`,
            }, () => { loadRoomState(roomId); })
            .on('postgres_changes', {
                event: 'UPDATE', schema: 'public', table: 'tournament_rooms',
                filter: `id=eq.${roomId}`,
            }, () => { loadRoomState(roomId); })
            .subscribe();

        channelRef.current = channel;
    };

    const selectGame = useCallback(async (game: GameType) => {
        clearBotTimers();

        if (user) {
            const roomId = await joinOrCreateRoom(game);
            if (roomId) {
                setState({
                    ...initialState,
                    gameType: game,
                    phase: 'radar',
                    round: 'waiting',
                    players: [CURRENT_PLAYER],
                    roomId,
                    isOnline: true,
                });
                subscribeToRoom(roomId);
                // Load initial state
                await loadRoomState(roomId);
                return;
            }
        }

        // Fallback to offline/bot mode
        setState({
            ...initialState,
            gameType: game,
            phase: 'radar',
            round: 'waiting',
            players: [CURRENT_PLAYER],
            isOnline: false,
        });
    }, [user, CURRENT_PLAYER]);

    const resetTournament = useCallback(() => {
        clearBotTimers();
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }
        setState(initialState);
    }, []);

    const invalidateSpectator = useCallback(() => {
        setState(prev => ({ ...prev, spectatorValid: false }));
    }, []);

    // ===== BOT MODE: Simulate bots joining (offline only) =====
    useEffect(() => {
        if (state.isOnline) return;
        if (state.phase !== 'radar' || state.round !== 'waiting') return;
        if (state.players.length >= 8) return;

        const delay = 800 + Math.random() * 1500;
        const timer = setTimeout(() => {
            setState(prev => {
                if (prev.players.length >= 8) return prev;
                const newBot = createBots(1, prev.players.length)[0];
                return { ...prev, players: [...prev.players, newBot] };
            });
        }, delay);

        return () => clearTimeout(timer);
    }, [state.phase, state.round, state.players.length, state.isOnline]);

    // ===== OFFLINE: When 8 players arrive → start QUARTERS =====
    useEffect(() => {
        if (state.isOnline) return;
        if (state.phase !== 'radar' || state.round !== 'waiting' || state.players.length !== 8) return;

        const timer = setTimeout(() => {
            setState(prev => {
                const shuffled = [...prev.players].sort(() => Math.random() - 0.5);
                const matches = createMatches(shuffled, 'quarters');
                const playingMatches = matches.map(m => ({ ...m, status: 'playing' as const }));
                const playerMatch = playingMatches.find(
                    m => m.player1?.id === CURRENT_PLAYER.id || m.player2?.id === CURRENT_PLAYER.id
                );

                return {
                    ...prev,
                    round: 'quarters',
                    phase: 'playing',
                    matches: playingMatches,
                    currentMatch: playerMatch || null,
                    currentPlayer: CURRENT_PLAYER,
                };
            });
        }, 2000);

        return () => clearTimeout(timer);
    }, [state.phase, state.round, state.players.length, state.isOnline]);

    // ===== OFFLINE: Simulate bot matches =====
    useEffect(() => {
        if (state.isOnline) return;
        if (state.phase !== 'playing' && state.phase !== 'radar') return;
        if (state.round === 'waiting' || state.round === 'champion') return;

        clearBotTimers();

        const currentRoundMatches = state.matches.filter(
            m => m.round === state.round && m.status === 'playing' && !m.winner &&
                m.id !== state.currentMatch?.id
        );

        currentRoundMatches.forEach(match => {
            const delay = 4000 + Math.random() * 8000;
            const timer = setTimeout(() => {
                setState(prev => {
                    const updated = prev.matches.map(m => {
                        if (m.id === match.id && !m.winner && m.player1 && m.player2) {
                            const winner = Math.random() > 0.5 ? m.player1 : m.player2;
                            return { ...m, winner, status: 'finished' as const };
                        }
                        return m;
                    });
                    return { ...prev, matches: updated };
                });
            }, delay);
            botMatchTimersRef.current.push(timer);
        });

        return () => clearBotTimers();
    }, [state.round, state.phase, state.currentMatch?.id, state.isOnline]);

    // ===== OFFLINE: Advance rounds =====
    useEffect(() => {
        if (state.isOnline) return;
        if (state.round === 'waiting' || state.round === 'champion') return;

        const roundMatches = state.matches.filter(m => m.round === state.round);
        if (roundMatches.length === 0) return;
        const allFinished = roundMatches.every(m => m.status === 'finished');
        if (!allFinished) return;

        const winners = roundMatches.map(m => m.winner!).filter(Boolean);

        if (state.round === 'final') {
            const champion = winners[0] || null;
            setState(prev => {
                if (prev.round === 'champion') return prev;
                return {
                    ...prev,
                    phase: 'radar',
                    round: 'champion',
                    champion,
                    currentMatch: null,
                    spectatorMode: prev.spectatorMode || !winners.some(w => w.id === CURRENT_PLAYER.id),
                    spectatorValid: true,
                };
            });
            return;
        }

        const nextRound: 'semis' | 'final' = state.round === 'quarters' ? 'semis' : 'final';
        const existingNext = state.matches.filter(m => m.round === nextRound);
        if (existingNext.length > 0) return;

        const hasPlayer = !state.spectatorMode;
        const delay = hasPlayer ? 5000 : 2000;
        const timer = setTimeout(() => {
            setState(prev => {
                const existing = prev.matches.filter(m => m.round === nextRound);
                if (existing.length > 0) return prev;

                const rMatches = prev.matches.filter(m => m.round === prev.round);
                const w = rMatches.map(m => m.winner!).filter(Boolean);
                if (w.length === 0) return prev;

                const nextMatches = createMatches(w, nextRound);
                const playingNext = nextMatches.map(m => ({ ...m, status: 'playing' as const }));

                const playerEliminated = prev.spectatorMode || !w.some(p => p.id === CURRENT_PLAYER.id);
                const playerMatch = playerEliminated
                    ? null
                    : playingNext.find(m => m.player1?.id === CURRENT_PLAYER.id || m.player2?.id === CURRENT_PLAYER.id);

                return {
                    ...prev,
                    matches: [...prev.matches, ...playingNext],
                    round: nextRound,
                    phase: playerMatch ? 'playing' : 'radar',
                    currentMatch: playerMatch || null,
                    spectatorMode: playerEliminated,
                    spectatorValid: playerEliminated ? true : prev.spectatorValid,
                };
            });
        }, delay);

        return () => clearTimeout(timer);
    }, [state.matches, state.round, state.isOnline]);

    const reportMatchResult = useCallback(async (matchId: string, winnerId: string) => {
        if (state.isOnline && state.roomId) {
            // Online: update DB — the server trigger handles round advancement
            const match = state.matches.find(m => m.id === matchId);
            if (match?.dbId) {
                const winnerPlayer = match.player1?.id === winnerId ? match.player1 : match.player2;
                const winnerProfileId = winnerPlayer?.profileId;
                if (winnerProfileId) {
                    await supabase
                        .from('tournament_matches')
                        .update({ winner_id: winnerProfileId, status: 'finished' })
                        .eq('id', match.dbId);

                    // Mark loser as eliminated
                    const loserPlayer = match.player1?.id === winnerId ? match.player2 : match.player1;
                    if (loserPlayer?.profileId) {
                        await supabase
                            .from('tournament_players')
                            .update({ is_eliminated: true })
                            .eq('room_id', state.roomId)
                            .eq('profile_id', loserPlayer.profileId);
                    }
                }
            }

            // Update local state immediately for smooth UX
            setState(prev => {
                const updatedMatches = prev.matches.map(m => {
                    if (m.id === matchId) {
                        const winner = m.player1?.id === winnerId ? m.player1 : m.player2;
                        return { ...m, winner, status: 'finished' as const };
                    }
                    return m;
                });
                const match = updatedMatches.find(m => m.id === matchId);
                const playerWon = match?.winner?.id === CURRENT_PLAYER.id;

                return {
                    ...prev,
                    matches: updatedMatches,
                    phase: 'radar' as const,
                    currentMatch: null,
                    spectatorMode: !playerWon,
                    spectatorValid: true,
                };
            });
        } else {
            // Offline: update local state only
            setState(prev => {
                const updatedMatches = prev.matches.map(m => {
                    if (m.id === matchId) {
                        const winner = m.player1?.id === winnerId ? m.player1 : m.player2;
                        return { ...m, winner, status: 'finished' as const };
                    }
                    return m;
                });
                const match = updatedMatches.find(m => m.id === matchId);
                const playerWon = match?.winner?.id === CURRENT_PLAYER.id;

                return {
                    ...prev,
                    matches: updatedMatches,
                    phase: 'radar' as const,
                    currentMatch: null,
                    spectatorMode: !playerWon,
                    spectatorValid: true,
                };
            });
        }
    }, [state.isOnline, state.roomId, state.matches, CURRENT_PLAYER.id]);

    const sendMove = useCallback(async (matchId: string, moveData: any) => {
        if (!state.isOnline || !profile) return;
        const match = state.matches.find(m => m.id === matchId);
        if (!match?.dbId) return;

        await supabase.from('game_moves').insert({
            match_id: match.dbId,
            player_id: profile.id,
            move_data: moveData,
        });
    }, [state.isOnline, state.matches, profile]);

    const setSpectatorMode = useCallback((val: boolean) => {
        setState(prev => ({ ...prev, spectatorMode: val }));
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearBotTimers();
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
        };
    }, []);

    return (
        <TournamentContext.Provider value={{
            state,
            selectGame,
            startTournament: () => { },
            reportMatchResult,
            setSpectatorMode,
            resetTournament,
            invalidateSpectator,
            currentPlayerObj: CURRENT_PLAYER,
            sendMove,
        }}>
            {children}
        </TournamentContext.Provider>
    );
};
