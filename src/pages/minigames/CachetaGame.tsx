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

type Suit = '♠' | '♥' | '♦' | '♣';
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | 'Q' | 'J' | 'K';
interface Card { suit: Suit; rank: Rank; id: string; }

const suits: Suit[] = ['♠', '♥', '♦', '♣'];
const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', 'Q', 'J', 'K'];
const isRed = (suit: Suit) => suit === '♥' || suit === '♦';

let cid = 0;
const createDeck = (): Card[] => {
  const deck: Card[] = [];
  for (const suit of suits) for (const rank of ranks) deck.push({ suit, rank, id: `cc${cid++}` });
  return deck.sort(() => Math.random() - 0.5);
};

// Real Cacheta/Pife win: all 9 cards must form 3 valid groups of 3
// Valid group: 3 of same rank OR 3 consecutive same suit
const rankOrder: Record<Rank, number> = { 'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, 'Q': 8, 'J': 9, 'K': 10 };

const isValidGroup = (cards: Card[]): boolean => {
  if (cards.length !== 3) return false;
  // Three of a kind (same rank)
  if (cards[0].rank === cards[1].rank && cards[1].rank === cards[2].rank) return true;
  // Sequence of same suit
  if (cards[0].suit !== cards[1].suit || cards[1].suit !== cards[2].suit) return false;
  const vals = cards.map(c => rankOrder[c.rank]).sort((a, b) => a - b);
  return (vals[1] - vals[0] === 1 && vals[2] - vals[1] === 1);
};

const checkWin = (hand: Card[]): boolean => {
  if (hand.length !== 9) return false;
  // Try all possible ways to split 9 cards into 3 groups of 3
  for (let i = 0; i < 9; i++) {
    for (let j = i + 1; j < 9; j++) {
      for (let k = j + 1; k < 9; k++) {
        const group1 = [hand[i], hand[j], hand[k]];
        const remaining = hand.filter((_, idx) => idx !== i && idx !== j && idx !== k);
        for (let a = 0; a < 6; a++) {
          for (let b = a + 1; b < 6; b++) {
            for (let c = b + 1; c < 6; c++) {
              const group2 = [remaining[a], remaining[b], remaining[c]];
              const group3 = remaining.filter((_, idx) => idx !== a && idx !== b && idx !== c);
              if (isValidGroup(group1) && isValidGroup(group2) && isValidGroup(group3)) {
                return true;
              }
            }
          }
        }
      }
    }
  }
  return false;
};

const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

const suitSymbols: Record<Suit, string> = { '♠': '♠', '♥': '♥', '♦': '♦', '♣': '♣' };

const CachetaCardComponent = ({ card, onClick, isBack, isEmpty }: {
  card?: Card; onClick?: () => void; isBack?: boolean; isEmpty?: boolean;
}) => {
  if (isEmpty) return (
    <div className="cacheta-card-real empty">
      <div className="cacheta-empty-inner">VAZIO</div>
    </div>
  );
  if (isBack) return (
    <div className="cacheta-card-real card-back" onClick={onClick}>
      <div className="cacheta-back-inner">
        <div className="cacheta-back-pattern">
          <div className="cacheta-back-oval">
            <span className="cacheta-back-symbol">🂠</span>
          </div>
        </div>
      </div>
    </div>
  );
  if (!card) return null;
  const red = isRed(card.suit);
  const suitChar = suitSymbols[card.suit];
  return (
    <div className={`cacheta-card-real ${red ? 'suit-red' : 'suit-black'}`} onClick={onClick}>
      <div className="cacheta-card-face">
        <div className="cacheta-corner top-left">
          <span className="cacheta-corner-rank">{card.rank}</span>
          <span className="cacheta-corner-suit">{suitChar}</span>
        </div>
        <div className="cacheta-center-area">
          <span className="cacheta-center-suit">{suitChar}</span>
        </div>
        <div className="cacheta-corner bottom-right">
          <span className="cacheta-corner-rank">{card.rank}</span>
          <span className="cacheta-corner-suit">{suitChar}</span>
        </div>
      </div>
    </div>
  );
};

const CachetaGame = () => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number>(0);
  const [touchCurrentCard, setTouchCurrentCard] = useState<number | null>(null);
  const navigate = useNavigate();
  const { state, reportMatchResult, currentPlayerObj } = useTournament();

  // Guard: if no game context, redirect to radar
  useEffect(() => {
    if (!state.gameType) navigate('/radar', { replace: true });
  }, [state.gameType, navigate]);
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [opponentHand, setOpponentHand] = useState<Card[]>([]);
  const [discardPile, setDiscardPile] = useState<Card[]>([]);
  const matchId = state.currentMatch?.id || 'local';
  const resumedRef = useRef(getResumedTimers(matchId, { gameType: state.gameType || 'cacheta', defaultIsPlayerTurn: true }));
  const [isPlayerTurn, setIsPlayerTurn] = useState(resumedRef.current.initialIsPlayerTurn);
  const [playerTime, setPlayerTime] = useState(resumedRef.current.initialPlayerTime);
  const [opponentTime, setOpponentTime] = useState(resumedRef.current.initialOpponentTime);
  const [gameOver, setGameOver] = useState(false);
  const [phase, setPhase] = useState<'draw' | 'discard'>('draw');
  const gameOverRef = useRef(false);
  const matchRef = useRef(state.currentMatch);
  useEffect(() => { matchRef.current = state.currentMatch; }, [state.currentMatch]);

  // Refs for latest state
  const deckRef = useRef(deck);
  const opponentHandRef = useRef(opponentHand);

  useEffect(() => { deckRef.current = deck; }, [deck]);
  useEffect(() => { opponentHandRef.current = opponentHand; }, [opponentHand]);

  
  useGameSession({ matchId, gameType: state.gameType || 'cacheta', playerTime, opponentTime, isPlayerTurn, gameOver });

  const isOnline = state.isOnline;

  const opponentName = state.currentMatch?.player1?.id === currentPlayerObj.id
    ? state.currentMatch?.player2?.name || 'Oponente' : state.currentMatch?.player1?.name || 'Oponente';
  const opponentAvatar = state.currentMatch?.player1?.id === currentPlayerObj.id
    ? state.currentMatch?.player2?.avatar || '?' : state.currentMatch?.player1?.avatar || '?';
  

  useEffect(() => {
    const d = createDeck();
    setPlayerHand(d.slice(0, 9));
    setOpponentHand(d.slice(9, 18));
    setDiscardPile([d[18]]);
    setDeck(d.slice(19));
  }, []);

  const opponentIdRef = useRef(
    state.currentMatch?.player1?.id === currentPlayerObj.id
      ? state.currentMatch?.player2?.id || ''
      : state.currentMatch?.player1?.id || ''
  );
  const getOpponentId = useCallback(() => opponentIdRef.current, []);

  const endGame = useCallback((winnerId: string) => {
    if (gameOverRef.current) return;
    gameOverRef.current = true;
    setGameOver(true);
    if (winnerId === currentPlayerObj.id) SFX.victory(); else SFX.defeat();
    const mid = matchRef.current?.id;
    setTimeout(() => {
      if (mid) reportMatchResult(mid, winnerId);
      navigate('/radar');
    }, 1500);
  }, [currentPlayerObj.id, reportMatchResult, navigate]);

  // Auto-lose if player was away >30s
  useEffect(() => {
    if (resumedRef.current.shouldAutoLose) endGame(getOpponentId());
  }, []);

  const handleOpponentMove = useCallback((move: GameMove) => {
    if (gameOverRef.current) return;
    if (move.type === 'draw_deck') {
      setDeck(prev => {
        if (prev.length === 0) return prev;
        setOpponentHand(oh => [...oh, prev[0]]);
        return prev.slice(1);
      });
      SFX.cardDraw();
    } else if (move.type === 'draw_discard') {
      setDiscardPile(prev => {
        if (prev.length === 0) return prev;
        const card = prev[prev.length - 1];
        setOpponentHand(oh => [...oh, card]);
        return prev.slice(0, -1);
      });
      SFX.cardDraw();
    } else if (move.type === 'discard') {
      const discardedCard = move.data.card as Card;
      setOpponentHand(prev => prev.filter((_, i) => i !== move.data.index));
      setDiscardPile(prev => [...prev, discardedCard]);
      SFX.cardPlay();
      if (move.data.won) {
        endGame(getOpponentId());
        return;
      }
    }
    setIsPlayerTurn(true);
    setPhase('draw');
  }, [endGame, getOpponentId]);

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

  const drawFromDeck = async () => {
    if (!isPlayerTurn || phase !== 'draw' || gameOver) return;
    setDeck(prev => {
      if (prev.length === 0) return prev;
      setPlayerHand(ph => [...ph, prev[0]]);
      return prev.slice(1);
    });
    setPhase('discard');
    SFX.cardDraw();
    if (isOnline) await sendMove('draw_deck', {});
  };

  const drawFromDiscard = async () => {
    if (!isPlayerTurn || phase !== 'draw' || gameOver) return;
    setDiscardPile(prev => {
      if (prev.length === 0) return prev;
      const card = prev[prev.length - 1];
      setPlayerHand(ph => [...ph, card]);
      return prev.slice(0, -1);
    });
    setPhase('discard');
    SFX.cardDraw();
    if (isOnline) await sendMove('draw_discard', {});
  };

  const discardCard = async (index: number) => {
    if (!isPlayerTurn || phase !== 'discard' || gameOver) return;
    // Silently block - no visual feedback for invalid phase
    const card = playerHand[index];
    setDiscardPile(prev => [...prev, card]);
    const newHand = playerHand.filter((_, i) => i !== index);
    setPlayerHand(newHand);
    setPhase('draw');
    SFX.cardPlay();
    const won = checkWin(newHand);
    if (won) { endGame(currentPlayerObj.id); if (isOnline) await sendMove('discard', { card, index, won: true }); return; }
    setIsPlayerTurn(false);
    if (isOnline) await sendMove('discard', { card, index, won: false });
  };

  // Bot (offline only)
  useEffect(() => {
    if (isOnline) return;
    if (isPlayerTurn || gameOver) return;
    const timer = setTimeout(() => {
      const d = deckRef.current;
      const hand = opponentHandRef.current;

      if (d.length > 0) {
        // Draw from deck using functional updates
        setDeck(prev => {
          if (prev.length === 0) return prev;
          const drawnCard = prev[0];
          // Schedule the rest of bot's turn
          setTimeout(() => {
            setOpponentHand(currentHand => {
              const newHand = [...currentHand, drawnCard];
              const discIdx = Math.floor(Math.random() * newHand.length);
              const discarded = newHand[discIdx];
              const finalHand = newHand.filter((_, i) => i !== discIdx);

              setDiscardPile(dp => [...dp, discarded]);
              SFX.cardPlay();

              if (checkWin(finalHand)) {
                endGame(getOpponentId());
              } else {
                setIsPlayerTurn(true);
                setPhase('draw');
              }

              return finalHand;
            });
          }, 500);
          return prev.slice(1);
        });
        SFX.cardDraw();
      } else {
        setIsPlayerTurn(true);
        setPhase('draw');
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [isPlayerTurn, gameOver, isOnline, endGame, getOpponentId]);

  const reorderHand = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setPlayerHand(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  }, []);

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      reorderHand(draggedIndex, index);
      setDraggedIndex(index);
    }
  };

  const handleDragEnd = () => setDraggedIndex(null);

  const handleTouchStart = (index: number) => (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchCurrentCard(index);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchCurrentCard === null) return;
    const touch = e.touches[0];
    const diff = touch.clientX - touchStartX;
    const cardWidth = 52;
    if (Math.abs(diff) > cardWidth * 0.6) {
      const direction = diff > 0 ? 1 : -1;
      const newIndex = touchCurrentCard + direction;
      if (newIndex >= 0 && newIndex < playerHand.length) {
        reorderHand(touchCurrentCard, newIndex);
        setTouchCurrentCard(newIndex);
        setTouchStartX(touch.clientX);
      }
    }
  };

  const handleTouchEnd = () => setTouchCurrentCard(null);

  const topDiscard = discardPile[discardPile.length - 1];
  const statusText = isPlayerTurn ? (phase === 'draw' ? 'COMPRE UMA CARTA' : 'DESCARTE UMA CARTA') : 'VEZ DO OPONENTE...';

  return (
    <div className="cacheta-root">
      <div className="cacheta-scanline" />
      <div className="cacheta-topbar">
        <button className="cacheta-back-btn" onClick={() => navigate('/radar')}>
          <ArrowLeft size={14} />
          <span>Voltar</span>
        </button>
        <h1 className="cacheta-title">ARENA <span>CACHETA</span></h1>
        <div className="cacheta-round-label flex items-center gap-2">
          {isOnline && (
            connected
              ? <Wifi size={12} className="text-green-400" />
              : <WifiOff size={12} className="text-red-400" />
          )}
          {formatTime(playerTime + opponentTime)}
        </div>
      </div>
      <div className="cacheta-game-info">
        <div className={`cacheta-player ${!isPlayerTurn ? 'active' : ''}`}>
          <div className="cacheta-player-identity">
            <div className="cacheta-player-avatar">{opponentAvatar}</div>
            <span className="cacheta-player-name">{opponentName}</span>
          </div>
          <span className={`cacheta-player-time ${opponentTime <= 30 ? 'time-critical' : ''}`}>{formatTime(opponentTime)}</span>
        </div>
        <div className="cacheta-turn-indicator">
          <span className="cacheta-turn-label">Turno</span>
          <span className="cacheta-turn-text">
            {isPlayerTurn ? 'SUA VEZ' : 'VEZ DO OPONENTE'}
          </span>
          {isOnline && (
            <span className="mt-1" style={{ fontSize: '9px', color: connected ? '#4ade80' : '#f87171' }}>
              {connected ? '● ON' : '○ ...'}
            </span>
          )}
        </div>
        <div className={`cacheta-player ${isPlayerTurn ? 'active' : ''}`}>
          <div className="cacheta-player-identity">
            <div className="cacheta-player-avatar">{currentPlayerObj.avatar}</div>
            <span className="cacheta-player-name">{currentPlayerObj.name}</span>
          </div>
          <span className={`cacheta-player-time ${playerTime <= 30 ? 'time-critical' : ''}`}>{formatTime(playerTime)}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '4px', zIndex: 10, marginBottom: '4px' }}>
        {opponentHand.map((_, i) => <div key={i} className="cacheta-hidden-card-real" />)}
      </div>
      <div className="cacheta-status-msg">{statusText}</div>
      <div className="cacheta-table-area">
        <CachetaCardComponent isBack onClick={drawFromDeck} />
        {topDiscard ? <div onClick={phase === 'draw' && isPlayerTurn ? drawFromDiscard : undefined} style={{ cursor: phase === 'draw' && isPlayerTurn ? 'pointer' : 'default' }}><CachetaCardComponent card={topDiscard} /></div> : <CachetaCardComponent isEmpty />}
      </div>
      <div className="cacheta-hand-container">
        <div className="cacheta-hand" onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          {playerHand.map((card, i) => (
            <div
              key={card.id}
              draggable
              onDragStart={handleDragStart(i)}
              onDragOver={handleDragOver(i)}
              onDragEnd={handleDragEnd}
              onTouchStart={handleTouchStart(i)}
              style={{
                opacity: draggedIndex === i || touchCurrentCard === i ? 0.5 : 1,
                transition: 'transform 0.15s ease',
              }}
            >
              <CachetaCardComponent card={card} onClick={() => discardCard(i)} />
            </div>
          ))}
        </div>
      </div>
      {gameOver && (
        <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="cacheta-gameover">
          🃏 FIM DE JOGO!
        </motion.div>
      )}
      <GameChat messages={chatMessages} onSend={sendChatMessage} currentPlayerId={currentPlayerObj.id} isOnline={isOnline} />
    </div>
  );
};

export default CachetaGame;
