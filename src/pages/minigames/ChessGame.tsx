import { useState, useEffect, useCallback, useRef } from 'react';
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

type PieceType = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
type PieceColor = 'white' | 'black';
type Piece = { type: PieceType; color: PieceColor } | null;
type Board = Piece[][];

const pieceSymbols: Record<PieceColor, Record<PieceType, string>> = {
  white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
  black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' },
};

const initBoard = (): Board => {
  const order: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
  const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let c = 0; c < 8; c++) {
    board[0][c] = { type: order[c], color: 'black' };
    board[1][c] = { type: 'pawn', color: 'black' };
    board[6][c] = { type: 'pawn', color: 'white' };
    board[7][c] = { type: order[c], color: 'white' };
  }
  return board;
};

const isValidBasicMove = (board: Board, fr: number, fc: number, tr: number, tc: number): boolean => {
  const piece = board[fr][fc];
  if (!piece) return false;
  const target = board[tr][tc];
  if (target && target.color === piece.color) return false;
  const dr = tr - fr, dc = tc - fc;
  switch (piece.type) {
    case 'pawn': {
      const dir = piece.color === 'white' ? -1 : 1;
      const startRow = piece.color === 'white' ? 6 : 1;
      if (dc === 0 && !target) {
        if (dr === dir) return true;
        if (dr === dir * 2 && fr === startRow && !board[fr + dir][fc]) return true;
      }
      if (Math.abs(dc) === 1 && dr === dir && target) return true;
      return false;
    }
    case 'rook':
      if (dr !== 0 && dc !== 0) return false;
      return isPathClear(board, fr, fc, tr, tc);
    case 'bishop':
      if (Math.abs(dr) !== Math.abs(dc)) return false;
      return isPathClear(board, fr, fc, tr, tc);
    case 'queen':
      if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return false;
      return isPathClear(board, fr, fc, tr, tc);
    case 'knight':
      return (Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2);
    case 'king':
      return Math.abs(dr) <= 1 && Math.abs(dc) <= 1;
  }
};

const isPathClear = (board: Board, fr: number, fc: number, tr: number, tc: number): boolean => {
  const dr = Math.sign(tr - fr), dc = Math.sign(tc - fc);
  let r = fr + dr, c = fc + dc;
  while (r !== tr || c !== tc) {
    if (board[r][c]) return false;
    r += dr; c += dc;
  }
  return true;
};

const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

const ChessGame = () => {
  const navigate = useNavigate();
  const { state, reportMatchResult, currentPlayerObj } = useTournament();

  // Guard: if no game context, redirect to radar
  useEffect(() => {
    if (!state.gameType) navigate('/radar', { replace: true });
  }, [state.gameType, navigate]);

  const [board, setBoard] = useState<Board>(initBoard);
  const matchId = state.currentMatch?.id || 'local';
  const resumedRef = useRef(getResumedTimers(matchId, { gameType: state.gameType || 'chess', defaultIsPlayerTurn: true }));
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [turn, setTurn] = useState<PieceColor>(resumedRef.current.initialIsPlayerTurn ? 'white' : 'black');
  const [validMoves, setValidMoves] = useState<[number, number][]>([]);
  const [playerTime, setPlayerTime] = useState(resumedRef.current.initialPlayerTime);
  const [opponentTime, setOpponentTime] = useState(resumedRef.current.initialOpponentTime);
  const [gameOver, setGameOver] = useState(false);
  const gameOverRef = useRef(false);
  const matchRef = useRef(state.currentMatch);
  useEffect(() => { matchRef.current = state.currentMatch; }, [state.currentMatch]);

  useGameSession({ matchId, gameType: state.gameType || 'chess', playerTime, opponentTime, isPlayerTurn: turn === 'white', gameOver });

  const isOnline = state.isOnline;
  const playerColor: PieceColor = 'white';
  const isPlayerTurn = turn === playerColor;

  const opponentName = state.currentMatch?.player1?.id === currentPlayerObj.id
    ? state.currentMatch?.player2?.name || 'Oponente' : state.currentMatch?.player1?.name || 'Oponente';
  const opponentAvatar = state.currentMatch?.player1?.id === currentPlayerObj.id
    ? state.currentMatch?.player2?.avatar || '?' : state.currentMatch?.player1?.avatar || '?';
  

  const applyMove = useCallback((b: Board, fr: number, fc: number, tr: number, tc: number): Board => {
    const newBoard = b.map(row => [...row]);
    const captured = newBoard[tr][tc];
    newBoard[tr][tc] = newBoard[fr][fc];
    newBoard[fr][fc] = null;
    if (newBoard[tr][tc]?.type === 'pawn' && (tr === 0 || tr === 7))
      newBoard[tr][tc] = { type: 'queen', color: newBoard[tr][tc]!.color };
    if (captured) SFX.capture(); else SFX.move();
    return newBoard;
  }, []);

  const handleOpponentMove = useCallback((move: GameMove) => {
    if (gameOverRef.current) return;
    setBoard(prev => applyMove(prev, move.data.fr, move.data.fc, move.data.tr, move.data.tc));
    setTurn(playerColor);
  }, [applyMove]);

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

  const getMovesForPiece = useCallback((r: number, c: number, b: Board) => {
    const moves: [number, number][] = [];
    for (let tr = 0; tr < 8; tr++)
      for (let tc = 0; tc < 8; tc++)
        if (isValidBasicMove(b, r, c, tr, tc)) moves.push([tr, tc]);
    return moves;
  }, []);

  const handleCellClick = async (r: number, c: number) => {
    if (gameOver || turn !== playerColor) return;
    if (selected) {
      if (validMoves.some(([vr, vc]) => vr === r && vc === c)) {
        const newBoard = applyMove(board, selected[0], selected[1], r, c);
        setBoard(newBoard);
        setSelected(null);
        setValidMoves([]);
        setTurn('black');
        if (isOnline) await sendMove('move', { fr: selected[0], fc: selected[1], tr: r, tc: c });
      } else {
        SFX.invalidMove();
        setSelected(null);
        setValidMoves([]);
      }
    } else if (board[r][c]?.color === playerColor) {
      const moves = getMovesForPiece(r, c, board);
      if (moves.length > 0) { setSelected([r, c]); setValidMoves(moves); }
    }
  };

  // Bot AI (offline only)
  useEffect(() => {
    if (isOnline) return;
    if (turn !== 'black' || gameOver) return;
    const timer = setTimeout(() => {
      const pieces: [number, number][] = [];
      board.forEach((row, r) => row.forEach((cell, c) => { if (cell?.color === 'black') pieces.push([r, c]); }));
      for (const [r, c] of pieces.sort(() => Math.random() - 0.5)) {
        const moves = getMovesForPiece(r, c, board);
        if (moves.length > 0) {
          const [nr, nc] = moves[Math.floor(Math.random() * moves.length)];
          const newBoard = applyMove(board, r, c, nr, nc);
          setBoard(newBoard);
          setTurn('white');
          return;
        }
      }
      endGame(currentPlayerObj.id);
    }, 800 + Math.random() * 1000);
    return () => clearTimeout(timer);
  }, [turn, board, gameOver, isOnline]);

  useEffect(() => {
    if (gameOver) return;
    if (!board.flat().some(p => p?.type === 'king' && p.color === 'white')) endGame(getOpponentId());
    if (!board.flat().some(p => p?.type === 'king' && p.color === 'black')) endGame(currentPlayerObj.id);
  }, [board]);

  return (
    <div className="chess-root">
      <div className="chess-scanline" />
      <div className="chess-topbar">
        <button className="chess-back-btn" onClick={() => navigate('/radar')}>
          <ArrowLeft size={14} />
          <span>Voltar</span>
        </button>
        <h1 className="chess-title">ARENA <span>XADREZ</span></h1>
        <div className="chess-game-timer flex items-center gap-2">
          {isOnline && (
            connected
              ? <Wifi size={12} className="text-green-400" />
              : <WifiOff size={12} className="text-red-400" />
          )}
          {formatTime(playerTime + opponentTime)}
        </div>
      </div>
      <div className="chess-game-info">
        <div className={`chess-player ${!isPlayerTurn ? 'active' : ''}`}>
          <div className="chess-player-identity">
            <div className="chess-player-avatar">{opponentAvatar}</div>
            <span className="chess-player-name">{opponentName}</span>
          </div>
          <span className={`chess-player-time ${opponentTime <= 30 ? 'time-critical' : ''}`}>{formatTime(opponentTime)}</span>
        </div>
        <div className="chess-turn-indicator">
          <span className="chess-turn-label">Turno</span>
          <span className="chess-turn-text">
            {isPlayerTurn ? 'SUA VEZ' : 'VEZ DO OPONENTE'}
          </span>
          {isOnline && (
            <span className="mt-1" style={{ fontSize: '9px', color: connected ? '#4ade80' : '#f87171' }}>
              {connected ? '● ON' : '○ ...'}
            </span>
          )}
        </div>
        <div className={`chess-player ${isPlayerTurn ? 'active' : ''}`}>
          <div className="chess-player-identity">
            <div className="chess-player-avatar">{currentPlayerObj.avatar}</div>
            <span className="chess-player-name">{currentPlayerObj.name}</span>
          </div>
          <span className={`chess-player-time ${playerTime <= 30 ? 'time-critical' : ''}`}>{formatTime(playerTime)}</span>
        </div>
      </div>
      <div className="chess-board-container">
        <div className="chess-board">
          {board.map((row, r) => row.map((cell, c) => {
            const isDark = (r + c) % 2 === 1;
            const isSelected = selected?.[0] === r && selected?.[1] === c;
            return (
              <button key={`${r}-${c}`} className={`chess-cell ${isDark ? 'dark' : 'light'}`} onClick={() => handleCellClick(r, c)}>
                {cell && (
                  <span className={`chess-piece ${cell.color === 'white' ? 'p1' : 'p2'} ${isSelected ? 'selected' : ''}`}>
                    {pieceSymbols[cell.color][cell.type]}
                  </span>
                )}
              </button>
            );
          }))}
        </div>
      </div>
      {gameOver && (
        <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="chess-gameover">
          ⚔️ FIM DE JOGO!
        </motion.div>
      )}
      <GameChat messages={chatMessages} onSend={sendChatMessage} currentPlayerId={currentPlayerObj.id} isOnline={isOnline} />
    </div>
  );
};

export default ChessGame;
