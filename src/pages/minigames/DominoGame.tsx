import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTournament } from '@/contexts/TournamentContext';
import { ArrowLeft, Wifi, WifiOff } from 'lucide-react';
import { SFX } from '@/lib/sounds';
import { useGameRealtime, GameMove } from '@/hooks/useGameRealtime';
import { useGameChat } from '@/hooks/useGameChat';
import GameChat from '@/components/game/GameChat';
import { useGameSession } from '@/hooks/useGameSession';
import { getResumedTimers } from '@/hooks/useResumedTimers';
import { useRealtimeTurnTimer } from '@/hooks/useRealtimeTurnTimer';

type DominoPiece = [number, number];

const allDominoes = (): DominoPiece[] => {
  const pieces: DominoPiece[] = [];
  for (let i = 0; i <= 6; i++) for (let j = i; j <= 6; j++) pieces.push([i, j]);
  return pieces;
};

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);
const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

const dotPositions: Record<number, { col: number; row: number }[]> = {
  0: [],
  1: [{ col: 2, row: 2 }],
  2: [{ col: 1, row: 1 }, { col: 3, row: 3 }],
  3: [{ col: 1, row: 1 }, { col: 2, row: 2 }, { col: 3, row: 3 }],
  4: [{ col: 1, row: 1 }, { col: 3, row: 1 }, { col: 1, row: 3 }, { col: 3, row: 3 }],
  5: [{ col: 1, row: 1 }, { col: 3, row: 1 }, { col: 2, row: 2 }, { col: 1, row: 3 }, { col: 3, row: 3 }],
  6: [{ col: 1, row: 1 }, { col: 3, row: 1 }, { col: 1, row: 2 }, { col: 3, row: 2 }, { col: 1, row: 3 }, { col: 3, row: 3 }],
};

const DominoHalf = ({ value, isTop }: { value: number; isTop: boolean }) => (
  <div className={`domino-half ${isTop ? 'top' : ''}`}>
    {dotPositions[value].map((pos, i) => (
      <div key={i} className="domino-dot" style={{ gridColumn: pos.col, gridRow: pos.row }} />
    ))}
  </div>
);

// On the board, non-doubles are horizontal, doubles are vertical
const BoardTile = ({ piece }: { piece: DominoPiece }) => {
  const isDouble = piece[0] === piece[1];
  return (
    <div className={`domino-tile on-board ${isDouble ? '' : 'horizontal'}`}>
      <DominoHalf value={piece[0]} isTop />
      <DominoHalf value={piece[1]} isTop={false} />
    </div>
  );
};

const DominoGame = () => {
  const navigate = useNavigate();
  const { state, reportMatchResult, currentPlayerObj } = useTournament();

  // Guard: if no game context, redirect to radar
  useEffect(() => {
    if (!state.gameType) navigate('/radar', { replace: true });
  }, [state.gameType, navigate]);
  const [playerHand, setPlayerHand] = useState<DominoPiece[]>([]);
  const [opponentHand, setOpponentHand] = useState<DominoPiece[]>([]);
  const [chain, setChain] = useState<DominoPiece[]>([]);
  const [leftEnd, setLeftEnd] = useState<number | null>(null);
  const [rightEnd, setRightEnd] = useState<number | null>(null);
  const matchId = state.currentMatch?.id || 'local';
  const resumedRef = useRef(getResumedTimers(matchId, { gameType: state.gameType || 'domino', defaultIsPlayerTurn: true }));
  const [isPlayerTurn, setIsPlayerTurn] = useState(resumedRef.current.initialIsPlayerTurn);
  const [playerTime, setPlayerTime] = useState(resumedRef.current.initialPlayerTime);
  const [opponentTime, setOpponentTime] = useState(resumedRef.current.initialOpponentTime);
  const [gameOver, setGameOver] = useState(false);
  const [passCount, setPassCount] = useState(0);
  const gameOverRef = useRef(false);
  const matchRef = useRef(state.currentMatch);
  useEffect(() => { matchRef.current = state.currentMatch; }, [state.currentMatch]);
  useGameSession({ matchId, gameType: state.gameType || 'domino', playerTime, opponentTime, isPlayerTurn, gameOver });

  const isOnline = state.isOnline;

  const opponentName = state.currentMatch?.player1?.id === currentPlayerObj.id
    ? state.currentMatch?.player2?.name || 'Oponente' : state.currentMatch?.player1?.name || 'Oponente';
  const opponentAvatar = state.currentMatch?.player1?.id === currentPlayerObj.id
    ? state.currentMatch?.player2?.avatar || '?' : state.currentMatch?.player1?.avatar || '?';
  

  useEffect(() => {
    const pieces = shuffle(allDominoes());
    setPlayerHand(pieces.slice(0, 7));
    setOpponentHand(pieces.slice(7, 14));
  }, []);

  const opponentIdRef = useRef(
    state.currentMatch?.player1?.id === currentPlayerObj.id
      ? state.currentMatch?.player2?.id || ''
      : state.currentMatch?.player1?.id || ''
  );
  const getOpponentId = () => opponentIdRef.current;

  const endGame = (winnerId: string) => {
    if (gameOverRef.current) return;
    gameOverRef.current = true;
    setGameOver(true);
    if (winnerId === currentPlayerObj.id) SFX.victory(); else SFX.defeat();
    const mid = matchRef.current?.id;
    setTimeout(() => {
      if (mid) reportMatchResult(mid, winnerId);
      navigate('/radar');
    }, 1500);
  };

  // Auto-lose if player was away >30s
  useEffect(() => {
    if (resumedRef.current.shouldAutoLose) endGame(getOpponentId());
  }, []);

  const canPlay = (piece: DominoPiece): 'left' | 'right' | 'both' | null => {
    if (chain.length === 0) return 'both';
    const matchLeft = piece[0] === leftEnd || piece[1] === leftEnd;
    const matchRight = piece[0] === rightEnd || piece[1] === rightEnd;
    if (matchLeft && matchRight) return 'both';
    if (matchLeft) return 'left';
    if (matchRight) return 'right';
    return null;
  };

  const playPiece = useCallback((piece: DominoPiece, side: 'left' | 'right') => {
    setChain(prev => {
      const newChain = [...prev];
      if (prev.length === 0) {
        newChain.push(piece);
        setLeftEnd(piece[0]);
        setRightEnd(piece[1]);
      } else if (side === 'left') {
        const lEnd = newChain[0][0];
        const oriented: DominoPiece = piece[1] === lEnd ? piece : [piece[1], piece[0]];
        newChain.unshift(oriented);
        setLeftEnd(oriented[0]);
      } else {
        const rEnd = newChain[newChain.length - 1][1];
        const oriented: DominoPiece = piece[0] === rEnd ? piece : [piece[1], piece[0]];
        newChain.push(oriented);
        setRightEnd(oriented[1]);
      }
      return newChain;
    });
    setPassCount(0);
    SFX.move();
  }, []);

  const handleOpponentMove = useCallback((move: GameMove) => {
    if (gameOverRef.current) return;
    if (move.type === 'play') {
      const piece: DominoPiece = [move.data.a, move.data.b];
      playPiece(piece, move.data.side);
      setOpponentHand(prev => prev.filter((_, i) => i !== move.data.index));
    } else if (move.type === 'pass') {
      setPassCount(prev => prev + 1);
    }
    setIsPlayerTurn(true);
  }, [playPiece]);

  const { sendMove, connected } = useGameRealtime({
    matchId: state.currentMatch?.id || null,
    playerId: currentPlayerObj.id,
    isOnline,
    onOpponentMove: handleOpponentMove,
  });

  const { messages: chatMessages, sendMessage: sendChatMessage } = useGameChat({
    matchId: state.currentMatch?.id || null,
    playerId: currentPlayerObj.id,
    playerName: currentPlayerObj.name,
    playerAvatar: currentPlayerObj.avatar,
    isOnline,
  });

  useRealtimeTurnTimer({
    isActive: !gameOver,
    isPlayerTurn,
    onPlayerTick: (elapsedSeconds) => {
      setPlayerTime(prev => {
        if (prev <= elapsedSeconds) {
          endGame(getOpponentId());
          return 0;
        }
        if (prev <= 30) SFX.tick();
        return prev - elapsedSeconds;
      });
    },
    onOpponentTick: (elapsedSeconds) => {
      setOpponentTime(prev => {
        if (prev <= elapsedSeconds) {
          endGame(currentPlayerObj.id);
          return 0;
        }
        return prev - elapsedSeconds;
      });
    },
  });

  const handlePlayerPlay = async (index: number) => {
    if (!isPlayerTurn || gameOver) return;
    const piece = playerHand[index];
    const side = canPlay(piece);
    if (!side) { SFX.invalidMove(); return; }
    const actualSide = side === 'both' ? 'right' : side;
    playPiece(piece, actualSide);
    setPlayerHand(prev => prev.filter((_, i) => i !== index));
    setIsPlayerTurn(false);
    if (isOnline) await sendMove('play', { a: piece[0], b: piece[1], side: actualSide, index });
  };

  const handlePass = async () => {
    if (!isPlayerTurn || gameOver) return;
    setPassCount(prev => prev + 1);
    setIsPlayerTurn(false);
    if (isOnline) await sendMove('pass', {});
  };

  useEffect(() => {
    if (gameOver) return;
    if (playerHand.length === 0 && chain.length > 0) endGame(currentPlayerObj.id);
    if (opponentHand.length === 0 && chain.length > 0) endGame(getOpponentId());
    if (passCount >= 2) {
      const pSum = playerHand.reduce((s, [a, b]) => s + a + b, 0);
      const oSum = opponentHand.reduce((s, [a, b]) => s + a + b, 0);
      endGame(pSum <= oSum ? currentPlayerObj.id : getOpponentId());
    }
  }, [playerHand, opponentHand, passCount]);

  // Bot (offline only)
  useEffect(() => {
    if (isOnline) return;
    if (isPlayerTurn || gameOver) return;
    const timer = setTimeout(() => {
      for (let i = 0; i < opponentHand.length; i++) {
        const side = canPlay(opponentHand[i]);
        if (side) {
          playPiece(opponentHand[i], side === 'both' ? 'right' : side);
          setOpponentHand(prev => prev.filter((_, idx) => idx !== i));
          setIsPlayerTurn(true);
          return;
        }
      }
      setPassCount(prev => prev + 1);
      setIsPlayerTurn(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, [isPlayerTurn, gameOver, isOnline]);

  const playerCanPlay = playerHand.some(p => canPlay(p));

  return (
    <div className="domino-root">
      <div className="domino-scanline" />
      <div className="domino-topbar">
        <button className="domino-back-btn" onClick={() => navigate('/radar')}>
          <ArrowLeft size={14} />
          <span>Voltar</span>
        </button>
        <h1 className="domino-title">ARENA <span>DOMINÓ</span></h1>
        <div className="domino-round-label flex items-center gap-2">
          {isOnline && (
            connected
              ? <Wifi size={12} className="text-green-400" />
              : <WifiOff size={12} className="text-red-400" />
          )}
          {formatTime(playerTime + opponentTime)}
        </div>
      </div>
      <div className="domino-game-info">
        <div className={`domino-player ${!isPlayerTurn ? 'active' : ''}`}>
          <div className="domino-player-identity">
            <div className="domino-player-avatar">{opponentAvatar}</div>
            <span className="domino-player-name">{opponentName}</span>
          </div>
          <span className={`domino-player-time ${opponentTime <= 30 ? 'time-critical' : ''}`}>{formatTime(opponentTime)}</span>
        </div>
        <div className="domino-turn-indicator">
          <span className="domino-turn-label">Turno</span>
          <span className="domino-turn-text">
            {isPlayerTurn ? 'SUA VEZ' : 'VEZ DO OPONENTE'}
          </span>
          {isOnline && (
            <span className="mt-1" style={{ fontSize: '9px', color: connected ? '#4ade80' : '#f87171' }}>
              {connected ? '● ON' : '○ ...'}
            </span>
          )}
        </div>
        <div className={`domino-player ${isPlayerTurn ? 'active' : ''}`}>
          <div className="domino-player-identity">
            <div className="domino-player-avatar">{currentPlayerObj.avatar}</div>
            <span className="domino-player-name">{currentPlayerObj.name}</span>
          </div>
          <span className={`domino-player-time ${playerTime <= 30 ? 'time-critical' : ''}`}>{formatTime(playerTime)}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '6px', zIndex: 10, marginBottom: '8px' }}>
        {opponentHand.map((_, i) => <div key={i} className="domino-hidden-tile" />)}
      </div>
      <div className="domino-board-container" style={{ minHeight: '140px', maxHeight: '200px' }}>
        <div className="domino-board-content">
          {chain.length === 0 && <span style={{ color: '#555', fontSize: '12px', fontFamily: 'Orbitron, monospace' }}>MESA VAZIA</span>}
          {chain.map((piece, i) => (
            <BoardTile key={i} piece={piece} />
          ))}
        </div>
      </div>
      <div className="domino-hand-container">
        {playerHand.map(([a, b], i) => (
            <div key={i} className="domino-tile" onClick={() => handlePlayerPlay(i)}>
              <DominoHalf value={a} isTop />
              <DominoHalf value={b} isTop={false} />
            </div>
        ))}
      </div>
      {isPlayerTurn && !playerCanPlay && !gameOver && (
        <div style={{ padding: '10px', zIndex: 10 }}>
          <button className="domino-action-btn pass" onClick={handlePass}>PASSAR VEZ</button>
        </div>
      )}
      {gameOver && (
        <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="domino-gameover">
          🁣 FIM DE JOGO!
        </motion.div>
      )}
      <GameChat messages={chatMessages} onSend={sendChatMessage} currentPlayerId={currentPlayerObj.id} isOnline={isOnline} />
    </div>
  );
};

export default DominoGame;
