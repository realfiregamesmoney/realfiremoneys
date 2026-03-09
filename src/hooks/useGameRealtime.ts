import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface GameMove {
    type: string;
    data: Record<string, any>;
    playerId: string;
    timestamp: number;
}

interface UseGameRealtimeProps {
    matchId: string | null;
    playerId: string;
    isOnline: boolean;
    onOpponentMove: (move: GameMove) => void;
}

export const useGameRealtime = ({
    matchId,
    playerId,
    isOnline,
    onOpponentMove,
}: UseGameRealtimeProps) => {
    const channelRef = useRef<RealtimeChannel | null>(null);
    const [connected, setConnected] = useState(false);
    const callbackRef = useRef(onOpponentMove);

    useEffect(() => {
        callbackRef.current = onOpponentMove;
    }, [onOpponentMove]);

    useEffect(() => {
        if (!isOnline || !matchId) return;

        const channel = supabase.channel(`game-${matchId}`, {
            config: { broadcast: { self: false } },
        });

        channel
            .on('broadcast', { event: 'move' }, (payload) => {
                const move = payload.payload as GameMove;
                if (move.playerId !== playerId) {
                    callbackRef.current(move);
                }
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') setConnected(true);
            });

        channelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
            channelRef.current = null;
            setConnected(false);
        };
    }, [matchId, playerId, isOnline]);

    const sendMove = useCallback(
        async (type: string, data: Record<string, any>) => {
            if (!channelRef.current || !isOnline) return;
            await channelRef.current.send({
                type: 'broadcast',
                event: 'move',
                payload: { type, data, playerId, timestamp: Date.now() } as GameMove,
            });
        },
        [playerId, isOnline]
    );

    return { sendMove, connected };
};
