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

type Cell = 'empty' | 'ship' | 'hit' | 'miss';
type Board = Cell[][];

const GRID = 10;
const createEmptyBoard = (): Board => Array.from({ length: GRID }, () => Array(GRID).fill('empty'));

const placeShipsRandomly = (board: Board): Board => {
  const ships = [5, 4, 3, 3, 2];
  const newBoard = board.map(r => [...r]);
  for (const size of ships) {
    let placed = false;
    while (!placed) {
      const horiz = Math.random() > 0.5;
      const r = Math.floor(Math.random() * GRID);
      const c = Math.floor(Math.random() * GRID);
      if (horiz && c + size <= GRID) {
        if (Array.from({ length: size }, (_, i) => newBoard[r][c + i]).every(v => v === 'empty')) {
          for (let i = 0; i < size; i++) newBoard[r][c + i] = 'ship';
          placed = true;
        }
      } else if (!horiz && r + size <= GRID) {
        if (Array.from({ length: size }, (_, i) => newBoard[r + i][c]).every(v => v === 'empty')) {
          for (let i = 0; i < size; i++) newBoard[r + i][c] = 'ship';
          placed = true;
        }
      }
    }
  }
  return newBoard;
};

const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

const BattleshipGame = () => {
  const navigate = useNavigate();
  const { state, reportMatchResult, currentPlayerObj } = useTournament();

  // Guard: if no game context, redirect to radar
  useEffect(() => {
    if (!state.gameType) navigate('/radar', { replace: true });
  }, [state.gameType, navigate]);
  const [playerBoard, setPlayerBoard] = useState<Board>(() => placeShipsRandomly(createEmptyBoard()));
  const [opponentBoard, setOpponentBoard] = useState<Board>(() => placeShipsRandomly(createEmptyBoard()));
  const [opponentDisplay, setOpponentDisplay] = useState<Board>(createEmptyBoard);
  const matchId = state.currentMatch?.id || 'local';
  const resumedRef = useRef(getResumedTimers(matchId, { gameType: state.gameType || 'battleship', defaultIsPlayerTurn: true }));
  const [isPlayerTurn, setIsPlayerTurn] = useState(resumedRef.current.initialIsPlayerTurn);
  const [playerTime, setPlayerTime] = useState(resumedRef.current.initialPlayerTime);
  const [opponentTime, setOpponentTime] = useState(resumedRef.current.initialOpponentTime);
  const [gameOver, setGameOver] = useState(false);
  const [statusMsg, setStatusMsg] = useState('POSICIONE SEUS NAVIOS');
  const [placementPhase, setPlacementPhase] = useState(true);
  const [placementTime, setPlacementTime] = useState(20);
  const gameOverRef = useRef(false);
  const matchRef = useRef(state.currentMatch);
  useEffect(() => { matchRef.current = state.currentMatch; }, [state.currentMatch]);
  useGameSession({ matchId, gameType: state.gameType || 'battleship', playerTime, opponentTime, isPlayerTurn, gameOver });

  const isOnline = state.isOnline;

  const opponentName = state.currentMatch?.player1?.id === currentPlayerObj.id
    ? state.currentMatch?.player2?.name || 'Oponente' : state.currentMatch?.player1?.name || 'Oponente';
  const opponentAvatar = state.currentMatch?.player1?.id === currentPlayerObj.id
    ? state.currentMatch?.player2?.avatar || '?' : state.currentMatch?.player1?.avatar || '?';
  

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

  const checkWin = useCallback((board: Board) => !board.flat().includes('ship'), []);

  // Handle opponent's shot on our board
  const handleOpponentMove = useCallback((move: GameMove) => {
    if (gameOverRef.current) return;
    if (move.type === 'shoot') {
      const { r, c } = move.data;
      setPlayerBoard(prev => {
        const newBoard = prev.map(row => [...row]);
        if (newBoard[r][c] === 'ship') {
          newBoard[r][c] = 'hit';
          SFX.hit();
        } else if (newBoard[r][c] === 'empty') {
          newBoard[r][c] = 'miss';
          SFX.miss();
        }
        if (!newBoard.flat().includes('ship')) {
          setTimeout(() => endGame(getOpponentId()), 100);
        }
        return newBoard;
      });
      setIsPlayerTurn(true);
      setStatusMsg('SELECIONE UM ALVO');
    }
  }, []);

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

  useEffect(() => {
    if (!placementPhase) return;
    if (placementTime <= 0) {
      setPlacementPhase(false);
      setStatusMsg('SELECIONE UM ALVO');
      SFX.phaseTransition();
      return;
    }
    if (placementTime <= 5) SFX.countdown();
    const timer = setTimeout(() => setPlacementTime(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [placementPhase, placementTime]);

  const shuffleShips = () => {
    if (!placementPhase) return;
    setPlayerBoard(placeShipsRandomly(createEmptyBoard()));
    SFX.cardPlay();
  };

  useRealtimeTurnTimer({
    isActive: !gameOver && !placementPhase,
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

  const handleShoot = async (r: number, c: number) => {
    if (!isPlayerTurn || gameOver || placementPhase || opponentDisplay[r][c] !== 'empty') return;
    const newOpponent = opponentBoard.map(row => [...row]);
    const newDisplay = opponentDisplay.map(row => [...row]);
    if (newOpponent[r][c] === 'ship') {
      newOpponent[r][c] = 'hit';
      newDisplay[r][c] = 'hit';
      setStatusMsg('ACERTOU! 💥');
      SFX.hit();
    } else {
      newOpponent[r][c] = 'miss';
      newDisplay[r][c] = 'miss';
      setStatusMsg('ÁGUA...');
      SFX.miss();
    }
    setOpponentBoard(newOpponent);
    setOpponentDisplay(newDisplay);
    if (checkWin(newOpponent)) { endGame(currentPlayerObj.id); return; }
    setIsPlayerTurn(false);
    if (isOnline) await sendMove('shoot', { r, c });
  };

  // Bot (offline only)
  useEffect(() => {
    if (isOnline) return;
    if (isPlayerTurn || gameOver || placementPhase) return;
    const delay = 1500 + Math.random() * 2000;
    const timer = setTimeout(() => {
      const available: [number, number][] = [];
      playerBoard.forEach((row, r) => row.forEach((cell, c) => {
        if (cell === 'empty' || cell === 'ship') available.push([r, c]);
      }));
      if (available.length === 0) { endGame(currentPlayerObj.id); return; }
      const [r, c] = available[Math.floor(Math.random() * available.length)];
      const newPlayer = playerBoard.map(row => [...row]);
      if (newPlayer[r][c] === 'ship') { SFX.hit(); } else { SFX.miss(); }
      newPlayer[r][c] = newPlayer[r][c] === 'ship' ? 'hit' : 'miss';
      setPlayerBoard(newPlayer);
      if (checkWin(newPlayer)) { endGame(getOpponentId()); return; }
      setIsPlayerTurn(true);
      setStatusMsg('SELECIONE UM ALVO');
    }, delay);
    return () => clearTimeout(timer);
  }, [isPlayerTurn, gameOver, placementPhase, isOnline]);

  const getCellClass = (cell: Cell, isShipVisible: boolean) => {
    if (cell === 'hit') return 'battleship-cell hit';
    if (cell === 'miss') return 'battleship-cell miss';
    if (cell === 'ship' && isShipVisible) return 'battleship-cell ship';
    return 'battleship-cell';
  };

  return (
    <div className="battleship-root">
      <div className="battleship-scanline" />
      <div className="battleship-topbar">
        <button className="battleship-back-btn" onClick={() => navigate('/radar')}>
          <ArrowLeft size={14} />
          <span>Voltar</span>
        </button>
        <h1 className="battleship-title">ARENA <span>NAVAL</span></h1>
        <div className="battleship-round-label flex items-center gap-2">
          {isOnline && (
            connected
              ? <Wifi size={12} className="text-green-400" />
              : <WifiOff size={12} className="text-red-400" />
          )}
          {formatTime(playerTime + opponentTime)}
        </div>
      </div>
      <div className="battleship-game-info">
        <div className={`battleship-player ${!isPlayerTurn ? 'active' : ''}`}>
          <div className="battleship-player-identity">
            <div className="battleship-player-avatar">{opponentAvatar}</div>
            <span className="battleship-player-name">{opponentName}</span>
          </div>
          <span className={`battleship-player-time ${opponentTime <= 30 ? 'time-critical' : ''}`}>{formatTime(opponentTime)}</span>
        </div>
        <div className="battleship-turn-indicator">
          <span className="battleship-turn-label">{placementPhase ? 'Preparação' : 'Turno'}</span>
          <span className="battleship-turn-text">
            {placementPhase ? `${placementTime}s` : isPlayerTurn ? 'SUA VEZ' : 'VEZ DO OPONENTE'}
          </span>
          {isOnline && (
            <span className="mt-1" style={{ fontSize: '9px', color: connected ? '#4ade80' : '#f87171' }}>
              {connected ? '● ON' : '○ ...'}
            </span>
          )}
        </div>
        <div className={`battleship-player ${isPlayerTurn ? 'active' : ''}`}>
          <div className="battleship-player-identity">
            <div className="battleship-player-avatar">{currentPlayerObj.avatar}</div>
            <span className="battleship-player-name">{currentPlayerObj.name}</span>
          </div>
          <span className={`battleship-player-time ${playerTime <= 30 ? 'time-critical' : ''}`}>{formatTime(playerTime)}</span>
        </div>
      </div>
      <div className="battleship-status-msg">{statusMsg}</div>

      {placementPhase && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          zIndex: 50, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          gap: '15px', padding: '20px'
        }}>
          <div style={{ fontFamily: 'Orbitron', fontSize: '14px', color: '#ffaa00', textTransform: 'uppercase', letterSpacing: '3px' }}>
            Posicione seus navios
          </div>
          <div style={{ fontFamily: 'Orbitron', fontSize: '48px', fontWeight: 900, color: '#fff', textShadow: '0 0 20px #ff5500' }}>
            {placementTime}
          </div>
          <div className="battleship-board-wrapper" style={{ transform: 'scale(0.85)' }}>
            <div className="battleship-board-title">⚓ SEU MAR</div>
            <div className="battleship-grid">
              {playerBoard.map((row, r) => row.map((cell, c) => (
                <div key={`p-${r}-${c}`} className={getCellClass(cell, true)} />
              )))}
            </div>
          </div>
          <button onClick={shuffleShips} style={{
            fontFamily: 'Orbitron', fontSize: '11px', padding: '10px 25px',
            background: 'transparent', border: '2px solid #ffaa00', color: '#ffaa00',
            borderRadius: '8px', cursor: 'pointer', textShadow: '0 0 5px #ffaa00',
            boxShadow: 'inset 0 0 10px rgba(255,170,0,0.3)'
          }}>
            🔄 EMBARALHAR NAVIOS
          </button>
        </div>
      )}

      <div className="battleship-boards">
        <div className="battleship-board-wrapper">
          <div className="battleship-board-title">⚓ SEU MAR</div>
          <div className={`battleship-grid ${!isPlayerTurn ? '' : 'disabled'}`}>
            {playerBoard.map((row, r) => row.map((cell, c) => (
              <div key={`p-${r}-${c}`} className={getCellClass(cell, true)} />
            )))}
          </div>
        </div>
        <div className="battleship-board-wrapper enemy">
          <div className="battleship-board-title">🎯 MAR INIMIGO</div>
          <div className={`battleship-grid enemy ${isPlayerTurn && !placementPhase ? '' : 'disabled'}`}>
            {opponentDisplay.map((row, r) => row.map((cell, c) => (
              <button key={`o-${r}-${c}`} className={`${getCellClass(cell, false)} enemy-cell`} onClick={() => handleShoot(r, c)} />
            )))}
          </div>
        </div>
      </div>

      {gameOver && (
        <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="battleship-gameover">
          ⚓ FIM DE JOGO!
        </motion.div>
      )}
      <GameChat messages={chatMessages} onSend={sendChatMessage} currentPlayerId={currentPlayerObj.id} isOnline={isOnline} />
    </div>
  );
};

export default BattleshipGame;
