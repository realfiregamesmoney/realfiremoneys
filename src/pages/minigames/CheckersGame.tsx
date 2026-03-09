import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTournament } from '@/contexts/TournamentContext';
import { ArrowLeft, Wifi, WifiOff } from 'lucide-react';
import { SFX } from '@/lib/sounds';
import { useCheckersRealtime, CheckersMove } from '@/hooks/useCheckersRealtime';
import { useGameChat } from '@/hooks/useGameChat';
import GameChat from '@/components/game/GameChat';
import { useGameSession } from '@/hooks/useGameSession';
import { getResumedTimers } from '@/hooks/useResumedTimers';
import { useRealtimeTurnTimer } from '@/hooks/useRealtimeTurnTimer';

type Piece = { color: 'red' | 'black'; isKing: boolean } | null;
type Board = Piece[][];

const initBoard = (): Board => {
  const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 8; c++)
      if ((r + c) % 2 === 1) board[r][c] = { color: 'black', isKing: false };
  for (let r = 5; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if ((r + c) % 2 === 1) board[r][c] = { color: 'red', isKing: false };
  return board;
};

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const CheckersGame = () => {
  const navigate = useNavigate();
  const { state, reportMatchResult, currentPlayerObj } = useTournament();

  // Guard: if no game context, redirect to radar
  useEffect(() => {
    if (!state.gameType) navigate('/radar', { replace: true });
  }, [state.gameType, navigate]);

  const matchId = state.currentMatch?.id || 'local';
  const storageKey = `checkers_state_${matchId}`;

  const loadSavedState = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  };

  const saved = useRef(loadSavedState());
  const resumedRef = useRef(getResumedTimers(matchId, {
    gameType: state.gameType || 'checkers',
    defaultIsPlayerTurn: (saved.current?.turn || 'red') === 'red',
  }));

  const [board, setBoard] = useState<Board>(() => saved.current?.board || initBoard());
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [turn, setTurn] = useState<'red' | 'black'>(() => saved.current?.turn || (resumedRef.current.initialIsPlayerTurn ? 'red' : 'black'));
  const [validMoves, setValidMoves] = useState<[number, number][]>([]);
  const [playerTime, setPlayerTime] = useState(resumedRef.current.initialPlayerTime);
  const [opponentTime, setOpponentTime] = useState(resumedRef.current.initialOpponentTime);
  const [gameOver, setGameOver] = useState(false);
  const gameOverRef = useRef(false);
  const matchRef = useRef(state.currentMatch);

  // Persist game state
  useEffect(() => {
    matchRef.current = state.currentMatch;
  }, [state.currentMatch]);
  useEffect(() => {
    if (gameOver) {
      localStorage.removeItem(storageKey);
      return;
    }
    localStorage.setItem(storageKey, JSON.stringify({ board, turn, playerTime, opponentTime }));
  }, [board, turn, playerTime, opponentTime, gameOver, storageKey]);

  useGameSession({ matchId, gameType: state.gameType || 'checkers', playerTime, opponentTime, isPlayerTurn: turn === 'red', gameOver });

  const isOnline = state.isOnline;
  const playerColor = 'red';
  const opponentColor = 'black';

  const opponentName = state.currentMatch?.player1?.id === currentPlayerObj.id
    ? state.currentMatch?.player2?.name || 'Oponente'
    : state.currentMatch?.player1?.name || 'Oponente';
  const opponentAvatar = state.currentMatch?.player1?.id === currentPlayerObj.id
    ? state.currentMatch?.player2?.avatar || '?'
    : state.currentMatch?.player1?.avatar || '?';

  // Apply a move to the board (used for both local and remote moves)
  const applyMove = useCallback((b: Board, fromR: number, fromC: number, toR: number, toC: number): Board => {
    const newBoard = b.map(row => [...row]);
    newBoard[toR][toC] = { ...newBoard[fromR][fromC]! };
    newBoard[fromR][fromC] = null;

    // Capture
    if (Math.abs(toR - fromR) === 2) {
      newBoard[(toR + fromR) / 2][(toC + fromC) / 2] = null;
      SFX.capture();
    } else {
      SFX.move();
    }

    // King promotion
    if ((newBoard[toR][toC]!.color === 'red' && toR === 0) ||
        (newBoard[toR][toC]!.color === 'black' && toR === 7)) {
      newBoard[toR][toC]!.isKing = true;
    }

    return newBoard;
  }, []);

  // Handle opponent move from realtime channel
  const handleOpponentMove = useCallback((move: CheckersMove) => {
    if (gameOverRef.current) return;

    setBoard(prev => {
      const newBoard = applyMove(prev, move.fromR, move.fromC, move.toR, move.toC);
      return newBoard;
    });
    setTurn(playerColor);
  }, [applyMove]);

  const { messages: chatMessages, sendMessage: sendChatMessage } = useGameChat({
    matchId: state.currentMatch?.id || null,
    playerId: currentPlayerObj.id,
    playerName: currentPlayerObj.name,
    playerAvatar: currentPlayerObj.avatar,
    isOnline,
  });

  // Realtime hook
  const { sendMove: sendRealtimeMove, connected } = useCheckersRealtime({
    matchId: state.currentMatch?.id || null,
    playerId: currentPlayerObj.id,
    isOnline,
    onOpponentMove: handleOpponentMove,
  });

  useRealtimeTurnTimer({
    isActive: !gameOver,
    isPlayerTurn: turn === playerColor,
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

  const getValidMoves = useCallback((r: number, c: number, b: Board): [number, number][] => {
    const piece = b[r][c];
    if (!piece) return [];
    const moves: [number, number][] = [];
    const dirs = piece.isKing ? [-1, 1] : piece.color === 'red' ? [-1] : [1];
    for (const dr of dirs) {
      for (const dc of [-1, 1]) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !b[nr][nc]) {
          moves.push([nr, nc]);
        }
        const jr = r + dr * 2, jc = c + dc * 2;
        if (jr >= 0 && jr < 8 && jc >= 0 && jc < 8 && !b[jr][jc] && b[nr]?.[nc] && b[nr][nc]!.color !== piece.color) {
          moves.push([jr, jc]);
        }
      }
    }
    return moves;
  }, []);

  const handleCellClick = async (r: number, c: number) => {
    if (gameOver || turn !== playerColor) return;
    if (selected) {
      const isValid = validMoves.some(([vr, vc]) => vr === r && vc === c);
      if (isValid) {
        const newBoard = applyMove(board, selected[0], selected[1], r, c);
        setBoard(newBoard);
        setSelected(null);
        setValidMoves([]);
        setTurn(opponentColor);

        // Send move via realtime if online
        if (isOnline) {
          await sendRealtimeMove({
            fromR: selected[0],
            fromC: selected[1],
            toR: r,
            toC: c,
          });
        }
    } else {
        SFX.invalidMove();
        setSelected(null);
        setValidMoves([]);
      }
    } else if (board[r][c]?.color === playerColor) {
      const moves = getValidMoves(r, c, board);
      if (moves.length > 0) {
        setSelected([r, c]);
        setValidMoves(moves);
      }
    }
  };

  // Bot move (only in offline mode)
  useEffect(() => {
    if (isOnline) return; // Skip bot logic when online
    if (turn !== opponentColor || gameOver) return;

    const timer = setTimeout(() => {
      const allPieces: [number, number][] = [];
      board.forEach((row, r) => row.forEach((cell, c) => {
        if (cell?.color === opponentColor) allPieces.push([r, c]);
      }));
      for (const [r, c] of allPieces.sort(() => Math.random() - 0.5)) {
        const moves = getValidMoves(r, c, board);
        if (moves.length > 0) {
          const [nr, nc] = moves[Math.floor(Math.random() * moves.length)];
          const newBoard = applyMove(board, r, c, nr, nc);
          setBoard(newBoard);
          setTurn(playerColor);
          return;
        }
      }
      endGame(currentPlayerObj.id);
    }, 600 + Math.random() * 800);
    return () => clearTimeout(timer);
  }, [turn, board, gameOver, isOnline]);

  // Check win
  useEffect(() => {
    if (gameOver) return;
    const redCount = board.flat().filter(p => p?.color === 'red').length;
    const blackCount = board.flat().filter(p => p?.color === 'black').length;
    if (redCount === 0) endGame(getOpponentId());
    if (blackCount === 0) endGame(currentPlayerObj.id);
  }, [board]);

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

  const totalTime = playerTime + opponentTime;
  const isPlayerTurn = turn === playerColor;

  return (
    <div className="checkers-root">
      <div className="checkers-scanline" />

      {/* Top Bar */}
      <div className="checkers-topbar">
        <button onClick={() => navigate('/radar')} className="checkers-back-btn">
          <ArrowLeft size={14} />
          <span>Voltar</span>
        </button>
        <h1 className="checkers-title">
          ARENA <span>BATTLE</span>
        </h1>
        <div className="checkers-game-timer flex items-center gap-2">
          {isOnline && (
            connected
              ? <Wifi size={12} className="text-green-400" />
              : <WifiOff size={12} className="text-red-400" />
          )}
          {formatTime(totalTime)}
        </div>
      </div>

      {/* Game Info / Players */}
      <div className="checkers-game-info">
        <div className={`checkers-player ${!isPlayerTurn ? 'active' : ''}`}>
          <div className="checkers-player-identity">
            <div className="checkers-player-avatar">{opponentAvatar}</div>
            <span className="checkers-player-name">{opponentName}</span>
          </div>
          <span className={`checkers-player-time ${opponentTime <= 30 ? 'time-critical' : ''}`}>{formatTime(opponentTime)}</span>
        </div>

        <div className="checkers-turn-indicator">
          <span className="checkers-turn-label">Turno</span>
          <span className="checkers-turn-text">
            {isPlayerTurn ? 'SUA VEZ' : 'VEZ DO OPONENTE'}
          </span>
          {isOnline && (
            <span className="mt-1" style={{ fontSize: '9px', color: connected ? '#4ade80' : '#f87171' }}>
              {connected ? '● ON' : '○ ...'}
            </span>
          )}
        </div>

        <div className={`checkers-player ${isPlayerTurn ? 'active' : ''}`}>
          <div className="checkers-player-identity">
            <div className="checkers-player-avatar">{currentPlayerObj.avatar}</div>
            <span className="checkers-player-name">{currentPlayerObj.name}</span>
          </div>
          <span className={`checkers-player-time ${playerTime <= 30 ? 'time-critical' : ''}`}>{formatTime(playerTime)}</span>
        </div>
      </div>

      {/* Board */}
      <div className="checkers-board-container">
        <div className="checkers-board">
          {board.map((row, r) =>
            row.map((cell, c) => {
              const isDark = (r + c) % 2 === 1;
              const isSelected = selected?.[0] === r && selected?.[1] === c;

              return (
                <motion.button
                  key={`${r}-${c}`}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleCellClick(r, c)}
                  className={`checkers-cell ${isDark ? 'dark' : 'light'}`}
                >
                  {cell && (
                    <div className={`checkers-piece ${cell.color === 'red' ? 'p1' : 'p2'} ${isSelected ? 'selected' : ''} ${cell.isKing ? 'king' : ''}`}>
                      {cell.isKing && <span className="checkers-king-icon">♛</span>}
                    </div>
                  )}
                </motion.button>
              );
            })
          )}
        </div>
      </div>

      {/* Game Over */}
      {gameOver && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="checkers-gameover"
        >
          FIM DE JOGO!
        </motion.div>
      )}

      <GameChat
        messages={chatMessages}
        onSend={sendChatMessage}
        currentPlayerId={currentPlayerObj.id}
        isOnline={isOnline}
      />
    </div>
  );
};

export default CheckersGame;
