import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTournament, GameType } from '@/contexts/TournamentContext';
import { useAuth } from '@/contexts/AuthContext';
import { getActiveSession, clearActiveSession, getSecondsAway, MAX_AWAY_SECONDS } from '@/hooks/useActiveSession';

const games: { type: GameType; name: string; icon: string; description: string }[] = [
  { type: 'checkers', name: 'Damas', icon: '⬛', description: 'Estratégia clássica de captura' },
  { type: 'chess', name: 'Xadrez', icon: '♚', description: 'O rei dos jogos de tabuleiro' },
  { type: 'domino', name: 'Dominó', icon: '🁣', description: 'Combine as peças e domine' },
  { type: 'battleship', name: 'Batalha Naval', icon: '🚢', description: 'Afunde a frota inimiga' },
  { type: 'uno', name: 'UNO', icon: '🃏', description: 'Cartas, cores e ação!' },
  { type: 'cacheta', name: 'Cacheta', icon: '🂡', description: 'Trinca e jogo rápido' },
];

const GameSelection = () => {
  const navigate = useNavigate();
  const { selectGame } = useTournament();
  const { profile, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeSession, setActiveSession] = useState(getActiveSession());
  const [countdown, setCountdown] = useState(0);

  // Check for active session and update countdown
  useEffect(() => {
    if (!activeSession) return;
    const update = () => {
      const session = getActiveSession();
      if (!session) {
        setActiveSession(null);
        return;
      }
      const remaining = MAX_AWAY_SECONDS - getSecondsAway(session);
      if (remaining <= 0) {
        clearActiveSession();
        setActiveSession(null);
        return;
      }
      setCountdown(remaining);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const handleRejoin = () => {
    if (!activeSession) return;
    navigate(`/game/${activeSession.gameType}`);
  };

  const handleSelect = async (gameType: GameType) => {
    if (loading) return;
    setLoading(true);
    clearActiveSession();
    try {
      await selectGame(gameType);
      navigate('/radar');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* User bar */}
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{profile?.avatar || '⭐'}</span>
          <span className="font-heading text-sm font-bold text-foreground">{profile?.username || 'Jogador'}</span>
        </div>
        <button onClick={handleLogout} className="text-xs font-heading text-muted-foreground hover:text-primary transition-colors">
          SAIR
        </button>
      </div>

      {/* Reconnect banner */}
      {activeSession && countdown > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-3 p-3 rounded-lg border border-primary/50 bg-primary/10 flex items-center justify-between gap-3"
        >
          <div className="flex flex-col">
            <span className="font-heading text-sm font-bold text-primary">⚡ PARTIDA EM ANDAMENTO</span>
            <span className="font-body text-xs text-muted-foreground">
              Você tem <span className="text-primary font-bold">10s</span> para voltar ao jogo <span className="text-primary font-bold">({countdown}s)</span>
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

      <div className="text-center pt-8 pb-8 px-4">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-4xl md:text-6xl font-black tracking-wider text-primary glow-text-primary"
        >
          ARENA BATTLE
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="font-heading text-xl text-muted-foreground mt-3"
        >
          Escolha sua batalha e entre no torneio
        </motion.p>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl w-full">
          {games.map((game, i) => (
            <motion.button
              key={game.type}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1, type: 'spring', stiffness: 200 }}
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleSelect(game.type)}
              disabled={loading}
              className={`group relative overflow-hidden rounded-xl border border-border bg-card p-8 text-left transition-all hover:border-primary/50 hover:glow-primary ${loading ? 'opacity-60 pointer-events-none' : ''}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <span className="text-5xl block mb-4">{game.icon}</span>
                <h2 className="font-display text-xl font-bold text-foreground tracking-wide">{game.name}</h2>
                <p className="font-body text-sm text-muted-foreground mt-2">{game.description}</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-primary font-heading font-semibold tracking-wider uppercase">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  Entrar no Torneio
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GameSelection;
