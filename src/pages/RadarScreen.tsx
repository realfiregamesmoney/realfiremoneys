import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTournament, Player } from '@/contexts/TournamentContext';
import BracketTree from '@/components/tournament/BracketTree';
import Confetti from '@/components/tournament/Confetti';
import { SFX } from '@/lib/sounds';
import { getActiveSession, clearActiveSession, getSecondsAway, MAX_AWAY_SECONDS } from '@/hooks/useActiveSession';

const RadarScreen = () => {
  const navigate = useNavigate();
  const { state, resetTournament, invalidateSpectator } = useTournament();
  const hasEnteredRef = useRef(false);
  const prevPlayerCountRef = useRef(state.players.length);
  const prevRoundRef = useRef(state.round);
  const [activeSession, setActiveSession] = useState(getActiveSession());
  const [reconnectCountdown, setReconnectCountdown] = useState(0);

  // Reconnect countdown
  useEffect(() => {
    if (!activeSession) return;
    const update = () => {
      const session = getActiveSession();
      if (!session) { setActiveSession(null); return; }
      const remaining = MAX_AWAY_SECONDS - getSecondsAway(session);
      if (remaining <= 0) {
        clearActiveSession();
        setActiveSession(null);
        return;
      }
      setReconnectCountdown(remaining);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const handleRejoin = () => {
    if (!activeSession) return;
    navigate(`/game/${activeSession.gameType}`);
  };
  useEffect(() => {
    if (!state.gameType) { navigate('/'); return; }
    if (hasEnteredRef.current && state.spectatorMode && !state.spectatorValid) {
      resetTournament(); navigate('/'); return;
    }
    hasEnteredRef.current = true;
    return () => { if (state.spectatorMode) invalidateSpectator(); };
  }, []);

  // Sound: player join
  useEffect(() => {
    if (state.players.length > prevPlayerCountRef.current) {
      SFX.playerJoin();
    }
    prevPlayerCountRef.current = state.players.length;
  }, [state.players.length]);

  // Sound: phase transition
  useEffect(() => {
    if (prevRoundRef.current !== state.round && state.round !== 'waiting') {
      if (state.round === 'champion') SFX.champion();
      else SFX.phaseTransition();
    }
    prevRoundRef.current = state.round;
  }, [state.round]);

  useEffect(() => {
    if (state.phase === 'playing' && state.currentMatch && state.gameType) {
      console.log('[RadarScreen] Redirecting to game:', state.gameType, 'match:', state.currentMatch.id);
      navigate(`/game/${state.gameType}`, { replace: true });
    }
  }, [state.phase, state.currentMatch, state.gameType, navigate]);

  const handleNewTournament = () => { resetTournament(); navigate('/'); };

  const gameNames: Record<string, string> = {
    checkers: 'Damas', chess: 'Xadrez', domino: 'Dominó',
    battleship: 'Batalha Naval', uno: 'UNO', cacheta: 'Cacheta',
  };

  const roundLabel = () => {
    switch (state.round) {
      case 'waiting': return 'SALA DE ESPERA';
      case 'quarters': return 'QUARTAS DE FINAL';
      case 'semis': return 'SEMIFINAIS';
      case 'final': return 'GRANDE FINAL';
      case 'champion': return '🏆 CAMPEÃO';
      default: return '';
    }
  };

  // Count completed rounds based on finished matches in the tournament
  const completedRounds = (() => {
    if (state.round === 'champion') return 3;
    const hasFinishedQuarters = state.matches.some(m => m.round === 'quarters' && m.status === 'finished');
    const hasFinishedSemis = state.matches.some(m => m.round === 'semis' && m.status === 'finished');
    const hasFinishedFinal = state.matches.some(m => m.round === 'final' && m.status === 'finished');
    return (hasFinishedQuarters ? 1 : 0) + (hasFinishedSemis ? 1 : 0) + (hasFinishedFinal ? 1 : 0);
  })();

  return (
    <div className="radar-screen">
      <Confetti active={state.round === 'champion' && !!state.champion} />
      <div className="radar-scanline" />

      {/* Reconnect banner */}
      {activeSession && reconnectCountdown > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-3 p-3 rounded-lg border border-primary/50 bg-primary/10 flex items-center justify-between gap-3 z-50 relative"
        >
          <div className="flex flex-col">
            <span className="font-heading text-sm font-bold text-primary">⚡ PARTIDA EM ANDAMENTO</span>
            <span className="font-body text-xs text-muted-foreground">
              Você tem <span className="text-primary font-bold">10s</span> para voltar ao jogo <span className="text-primary font-bold">({reconnectCountdown}s)</span>
            </span>
          </div>
          <button
            onClick={handleRejoin}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-heading text-xs font-bold tracking-wider hover:bg-primary/90 transition-colors animate-pulse"
          >
            VOLTAR
          </button>
        </motion.div>
      )}

      {/* Header */}
      <div className="radar-header">
        <div className="radar-header-game">
          {gameNames[state.gameType || ''] || ''}
        </div>
        <h1 className="radar-header-round">{roundLabel()}</h1>
        {state.round !== 'waiting' && (
          <div className="radar-header-progress">
            Rodada: <span>{completedRounds}</span> / 3
          </div>
        )}
      </div>

      {/* Spectator Banner */}
      <AnimatePresence>
        {state.spectatorMode && state.round !== 'champion' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="radar-spectator-banner"
          >
            <div className="radar-spectator-badge">🔴 MODO ESPECTADOR</div>
            <p className="radar-spectator-text">Você foi eliminado. Assista ou inicie um novo torneio.</p>
            <button onClick={handleNewTournament} className="radar-new-btn">
              🔄 NOVO TORNEIO
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Champion */}
      <AnimatePresence>
        {state.round === 'champion' && state.champion && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            className="radar-champion"
          >
            <div className="radar-champion-avatar">{state.champion.avatar}</div>
            <h2 className="radar-champion-name">{state.champion.name}</h2>
            <p className="radar-champion-label">CAMPEÃO DO TORNEIO</p>
            <button onClick={handleNewTournament} className="radar-new-btn">
              🔄 NOVO TORNEIO
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bracket */}
      <div className="radar-bracket-area">
        <BracketTree matches={state.matches} players={state.players} champion={state.champion} />
      </div>

      {/* Players status: classified & eliminated */}

      {/* Classified banner for current player */}
      {state.phase === 'radar' && !state.spectatorMode && state.round !== 'waiting' && state.round !== 'champion' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="radar-classified">
          <div className="radar-classified-badge">✅ CLASSIFICADO</div>
          <p className="radar-classified-text">Aguardando outras partidas...</p>
          <div className="radar-classified-spinner" />
        </motion.div>
      )}
    </div>
  );
};

export default RadarScreen;
