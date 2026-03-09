import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTournament } from '@/contexts/TournamentContext';
import { ArrowLeft, Wifi, WifiOff } from 'lucide-react';
import { SFX } from '@/lib/sounds';
import { useGameRealtime, GameMove } from '@/hooks/useGameRealtime';
import { useGameChat } from '@/hooks/useGameChat';
import GameChat from '@/components/game/GameChat';
import { useGameSession } from '@/hooks/useGameSession';
import { getResumedTimers } from '@/hooks/useResumedTimers';
import { useRealtimeTurnTimer } from '@/hooks/useRealtimeTurnTimer';

type CardColor = 'red' | 'blue' | 'green' | 'yellow';
type CardType = 'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4';
interface UnoCard { color: CardColor | 'wild'; type: CardType; value?: number; id: string; }

const colors: CardColor[] = ['red', 'blue', 'green', 'yellow'];

let cardId = 0;
const createDeck = (): UnoCard[] => {
  const deck: UnoCard[] = [];
  for (const color of colors) {
    // 0 appears once, 1-9 appear twice per color
    deck.push({ color, type: 'number', value: 0, id: `c${cardId++}` });
    for (let v = 1; v <= 9; v++) {
      deck.push({ color, type: 'number', value: v, id: `c${cardId++}` });
      deck.push({ color, type: 'number', value: v, id: `c${cardId++}` });
    }
    // 2 of each action card per color
    for (const t of ['skip', 'reverse', 'draw2'] as CardType[]) {
      deck.push({ color, type: t, id: `c${cardId++}` });
      deck.push({ color, type: t, id: `c${cardId++}` });
    }
  }
  // 4 wild + 4 wild draw 4
  for (let i = 0; i < 4; i++) {
    deck.push({ color: 'wild', type: 'wild', id: `c${cardId++}` });
    deck.push({ color: 'wild', type: 'wild4', id: `c${cardId++}` });
  }
  return shuffle(deck);
};

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

const cardLabel = (card: UnoCard) => {
  if (card.type === 'number') return `${card.value}`;
  if (card.type === 'skip') return '⊘';
  if (card.type === 'reverse') return '⟲';
  if (card.type === 'draw2') return '+2';
  if (card.type === 'wild') return '✦';
  return '+4';
};

const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

const UnoCardComponent = ({ card, onClick, disabled, isBack }: { card?: UnoCard; onClick?: () => void; disabled?: boolean; isBack?: boolean }) => {
  if (isBack) {
    return (
      <div className="uno-card-real card-back" onClick={onClick}>
        <div className="uno-card-inner-back">
          <div className="uno-back-oval">
            <span className="uno-back-logo">UNO</span>
          </div>
        </div>
      </div>
    );
  }
  if (!card) return null;
  const label = cardLabel(card);
  const colorClass = card.color === 'wild' ? 'wild' : card.color;
  return (
    <div className={`uno-card-real ${colorClass}`} onClick={disabled ? undefined : onClick}>
      <div className="uno-card-inner">
        <span className="uno-real-corner top-left">{label}</span>
        <div className="uno-real-oval">
          <span className="uno-real-center">{label}</span>
        </div>
        <span className="uno-real-corner bottom-right">{label}</span>
      </div>
    </div>
  );
};

// ===== UNO RULES =====
// A card can be played if:
// 1. It's a wild card (wild or wild4) — always playable
// 2. Its color matches the current active color
// 3. Its value matches the discard's value (number cards only)
// 4. Its type matches the discard's type (action cards: skip matches skip, etc.)
const canPlayCardCheck = (card: UnoCard, activeColor: CardColor, disc: UnoCard | null): boolean => {
  if (!disc) return true;
  if (card.color === 'wild') return true;
  if (card.color === activeColor) return true;
  // Match by number value
  if (card.type === 'number' && disc.type === 'number' && card.value === disc.value) return true;
  // Match by action type (skip on skip, reverse on reverse, draw2 on draw2)
  if (card.type !== 'number' && card.type !== 'wild' && card.type !== 'wild4' && card.type === disc.type) return true;
  return false;
};

// In 2-player UNO: skip, reverse, +2, +4 all give extra turn
const isExtraTurnCard = (card: UnoCard) =>
  card.type === 'skip' || card.type === 'reverse' || card.type === 'draw2' || card.type === 'wild4';

const UnoGame = () => {
  const navigate = useNavigate();
  const { state, reportMatchResult, currentPlayerObj } = useTournament();

  // Guard: if no game context, redirect to radar
  useEffect(() => {
    if (!state.gameType) navigate('/radar', { replace: true });
  }, [state.gameType, navigate]);
  const [deck, setDeck] = useState<UnoCard[]>([]);
  const [playerHand, setPlayerHand] = useState<UnoCard[]>([]);
  const [opponentHand, setOpponentHand] = useState<UnoCard[]>([]);
  const [discard, setDiscard] = useState<UnoCard | null>(null);
  const [currentColor, setCurrentColor] = useState<CardColor>('red');
  const matchId = state.currentMatch?.id || 'local';
  const resumedRef = useRef(getResumedTimers(matchId, { gameType: state.gameType || 'uno', defaultIsPlayerTurn: true }));
  const [isPlayerTurn, setIsPlayerTurn] = useState(resumedRef.current.initialIsPlayerTurn);
  const [playerTime, setPlayerTime] = useState(resumedRef.current.initialPlayerTime);
  const [opponentTime, setOpponentTime] = useState(resumedRef.current.initialOpponentTime);
  const [gameOver, setGameOver] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pendingWildCard, setPendingWildCard] = useState<number | null>(null);
  const [unoAlert, setUnoAlert] = useState<string | null>(null);
  const [calledUno, setCalledUno] = useState(false);
  const [showUnoButton, setShowUnoButton] = useState(false);
  const [botTurnTrigger, setBotTurnTrigger] = useState(0); // used to re-trigger bot effect for extra turns
  const [drawnCard, setDrawnCard] = useState<UnoCard | null>(null); // card just drawn, can be played
  const [drawStack, setDrawStack] = useState(0); // accumulated +2/+4 penalty
  const [stackType, setStackType] = useState<'draw2' | 'wild4' | null>(null); // type of active stack
  const gameOverRef = useRef(false);
  const matchRef = useRef(state.currentMatch);

  // Refs for latest state
  const deckRef = useRef(deck);
  const playerHandRef = useRef(playerHand);
  const opponentHandRef = useRef(opponentHand);
  const discardRef = useRef(discard);
  const currentColorRef = useRef(currentColor);
  const calledUnoRef = useRef(calledUno);
  const drawStackRef = useRef(drawStack);
  const stackTypeRef = useRef(stackType);

  useEffect(() => { deckRef.current = deck; }, [deck]);
  useEffect(() => { playerHandRef.current = playerHand; }, [playerHand]);
  useEffect(() => { opponentHandRef.current = opponentHand; }, [opponentHand]);
  useEffect(() => { discardRef.current = discard; }, [discard]);
  useEffect(() => { currentColorRef.current = currentColor; }, [currentColor]);
  useEffect(() => { calledUnoRef.current = calledUno; }, [calledUno]);
  useEffect(() => { drawStackRef.current = drawStack; }, [drawStack]);
  useEffect(() => { stackTypeRef.current = stackType; }, [stackType]);
  useEffect(() => { matchRef.current = state.currentMatch; }, [state.currentMatch]);

  
  useGameSession({ matchId, gameType: state.gameType || 'uno', playerTime, opponentTime, isPlayerTurn, gameOver });

  const isOnline = state.isOnline;

  const opponentName = state.currentMatch?.player1?.id === currentPlayerObj.id
    ? state.currentMatch?.player2?.name || 'Oponente' : state.currentMatch?.player1?.name || 'Oponente';
  const opponentAvatar = state.currentMatch?.player1?.id === currentPlayerObj.id
    ? state.currentMatch?.player2?.avatar || '?' : state.currentMatch?.player1?.avatar || '?';
  

  // === Initialize game ===
  useEffect(() => {
    const d = createDeck();
    const pHand = d.slice(0, 7);
    const oHand = d.slice(7, 14);
    const remaining = d.slice(14);

    // Find first number card for the discard pile (UNO rules: can't start with action/wild)
    const firstIdx = remaining.findIndex(c => c.type === 'number');
    const firstCard = firstIdx >= 0 ? remaining[firstIdx] : remaining[0];
    const deckAfter = remaining.filter((_, i) => i !== firstIdx);

    setPlayerHand(pHand);
    setOpponentHand(oHand);
    setDiscard(firstCard);
    setCurrentColor(firstCard.color === 'wild' ? 'red' : firstCard.color as CardColor);
    setDeck(deckAfter);
  }, []);

  const opponentIdRef = useRef(
    state.currentMatch?.player1?.id === currentPlayerObj.id
      ? state.currentMatch?.player2?.id || ''
      : state.currentMatch?.player1?.id || ''
  );
  const getOpponentId = () => opponentIdRef.current;

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

  // During a stack, only matching stack cards can be played
  const canPlayCard = (card: UnoCard) => {
    if (stackType) {
      // During a +2 stack, only +2 cards can be played
      if (stackType === 'draw2') return card.type === 'draw2';
      // During a +4 stack, only +4 cards can be played
      if (stackType === 'wild4') return card.type === 'wild4';
      return false;
    }
    return canPlayCardCheck(card, currentColor, discard);
  };

  // === Recycle discard pile into deck when deck is empty ===
  const recycleDeck = useCallback((currentDeck: UnoCard[], currentDiscard: UnoCard | null): UnoCard[] => {
    if (currentDeck.length > 0) return currentDeck;
    // This is an emergency fallback — shouldn't normally happen in a normal game
    // In real UNO, you reshuffle the discard pile (minus top card) back into the deck
    // We can't access the full discard history here, so we create fresh cards
    const freshDeck = createDeck().filter(c => c.id !== currentDiscard?.id);
    return shuffle(freshDeck);
  }, []);

  // Show UNO button when player has exactly 2 cards and it's their turn
  useEffect(() => {
    if (playerHand.length === 2 && isPlayerTurn && !gameOver) {
      setShowUnoButton(true);
      setCalledUno(false);
    } else if (playerHand.length !== 2) {
      setShowUnoButton(false);
      setCalledUno(false);
    }
  }, [playerHand.length, isPlayerTurn, gameOver]);

  const handleCallUno = () => {
    setCalledUno(true);
    setShowUnoButton(false);
    setUnoAlert('VOCÊ');
    SFX.cardPlay();
    setTimeout(() => setUnoAlert(null), 1500);
  };

  const applyUnoPenalty = () => {
    setDeck(prev => {
      const available = prev.length >= 2 ? prev : recycleDeck(prev, discardRef.current);
      const drawn = available.slice(0, 2);
      if (drawn.length > 0) {
        setPlayerHand(ph => [...ph, ...drawn]);
      }
      return available.slice(2);
    });
    setUnoAlert('PENALIDADE! +2');
    setTimeout(() => setUnoAlert(null), 2000);
  };

  const handleOpponentMove = useCallback((move: GameMove) => {
    if (gameOverRef.current) return;
    if (move.type === 'play') {
      const card = move.data.card as UnoCard;
      setDiscard(card);
      setOpponentHand(prev => prev.filter((_, i) => i !== move.data.index));
      if (card.color !== 'wild') setCurrentColor(card.color as CardColor);
      else setCurrentColor(move.data.chosenColor || 'red');
      SFX.cardPlay();

      // Handle stacking from opponent
      if (card.type === 'draw2' || card.type === 'wild4') {
        const newStack = move.data.stack || (card.type === 'draw2' ? 2 : 4);
        setDrawStack(newStack);
        setStackType(card.type as 'draw2' | 'wild4');
        // Player gets a chance to counter — give them the turn
        setIsPlayerTurn(true);
        return;
      }

      // In 2-player: skip, reverse = opponent gets extra turn (player skipped)
      if (card.type === 'skip' || card.type === 'reverse') {
        return; // don't give turn to player
      }
    } else if (move.type === 'draw') {
      // Opponent accepted the stack or drew normally
      if (move.data.stackAccepted) {
        const count = move.data.stackCount || 1;
        setDeck(prev => {
          const available = prev.length >= count ? prev : recycleDeck(prev, discardRef.current);
          const drawn = available.slice(0, count);
          setOpponentHand(oh => [...oh, ...drawn]);
          return available.slice(count);
        });
        setDrawStack(0);
        setStackType(null);
      } else {
        setDeck(prev => {
          const available = prev.length > 0 ? prev : recycleDeck(prev, discardRef.current);
          if (available.length === 0) return prev;
          setOpponentHand(oh => [...oh, available[0]]);
          return available.slice(1);
        });
      }
      SFX.cardDraw();
    }
    setIsPlayerTurn(true);
  }, [recycleDeck]);

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

  // === Play a card ===
  const executePlay = async (card: UnoCard, index: number, chosenColor?: CardColor) => {
    const handBefore = playerHandRef.current;

    // Check UNO penalty: playing from 2 cards to 1 without calling UNO
    const shouldPenalize = handBefore.length === 2 && !calledUnoRef.current;

    // Play the card
    setDiscard(card);
    setPlayerHand(prev => prev.filter((_, i) => i !== index));
    setDrawnCard(null);

    if (card.color !== 'wild') {
      setCurrentColor(card.color as CardColor);
    } else {
      setCurrentColor(chosenColor || colors[Math.floor(Math.random() * 4)]);
    }
    SFX.cardPlay();

    if (shouldPenalize) {
      setTimeout(() => applyUnoPenalty(), 300);
    }

    // Handle stacking logic for +2 and +4
    if (card.type === 'draw2') {
      const newStack = drawStackRef.current + 2;
      setDrawStack(newStack);
      setStackType('draw2');
      // Don't apply draw to opponent yet — they get a chance to counter
      setIsPlayerTurn(false);
      if (isOnline) await sendMove('play', { card, index, chosenColor, stack: newStack, stackType: 'draw2' });
      return;
    }
    if (card.type === 'wild4') {
      const newStack = drawStackRef.current + 4;
      setDrawStack(newStack);
      setStackType('wild4');
      setIsPlayerTurn(false);
      if (isOnline) await sendMove('play', { card, index, chosenColor, stack: newStack, stackType: 'wild4' });
      return;
    }

    // Non-stack card clears any pending stack (shouldn't happen due to canPlayCard, but safety)
    setDrawStack(0);
    setStackType(null);

    // Extra turn cards: skip, reverse keep the turn (draw2/wild4 handled above)
    if (card.type === 'skip' || card.type === 'reverse') {
      // extra turn in 2-player
    } else {
      setIsPlayerTurn(false);
    }
    if (isOnline) await sendMove('play', { card, index, chosenColor });
  };

  const handlePlay = async (index: number) => {
    if (!isPlayerTurn || gameOver) return;
    const card = playerHandRef.current[index];
    if (!card) return;

    // If we just drew a card, only that card can be played (or pass)
    if (drawnCard && card.id !== drawnCard.id) {
      SFX.invalidMove();
      return;
    }

    if (!canPlayCard(card)) {
      SFX.invalidMove();
      return;
    }

    if (card.color === 'wild' || card.type === 'wild4') {
      setPendingWildCard(index);
      setShowColorPicker(true);
      return;
    }
    await executePlay(card, index);
  };

  const handleColorChoice = async (color: CardColor) => {
    if (pendingWildCard === null) return;
    const card = playerHandRef.current[pendingWildCard];
    if (!card) return;
    const idx = pendingWildCard;
    setPendingWildCard(null);
    setShowColorPicker(false);
    await executePlay(card, idx, color);
  };

  // === Draw a card / Accept stack penalty ===
  const drawCard = async () => {
    if (!isPlayerTurn || gameOver || drawnCard) return;

    // If there's an active stack and player can't counter, they must accept the full penalty
    if (drawStackRef.current > 0 && stackTypeRef.current) {
      const totalDraw = drawStackRef.current;
      setDeck(prev => {
        const available = prev.length >= totalDraw ? prev : recycleDeck(prev, discardRef.current);
        const drawn = available.slice(0, totalDraw);
        setPlayerHand(ph => [...ph, ...drawn]);
        return available.slice(totalDraw);
      });
      SFX.cardDraw();
      setUnoAlert(`COMPROU +${totalDraw}!`);
      setTimeout(() => setUnoAlert(null), 2000);
      setDrawStack(0);
      setStackType(null);
      setIsPlayerTurn(false);
      if (isOnline) await sendMove('draw', { stackAccepted: true, stackCount: totalDraw });
      return;
    }

    // Normal draw
    let drawn: UnoCard | null = null;

    setDeck(prev => {
      const available = prev.length > 0 ? prev : recycleDeck(prev, discardRef.current);
      if (available.length === 0) {
        setIsPlayerTurn(false);
        return prev;
      }
      drawn = available[0];
      setPlayerHand(ph => [...ph, drawn!]);
      return available.slice(1);
    });

    SFX.cardDraw();

    if (isOnline) await sendMove('draw', {});

    setTimeout(() => {
      if (!drawn) { setIsPlayerTurn(false); return; }
      const canPlay = canPlayCardCheck(drawn, currentColorRef.current, discardRef.current);
      if (canPlay) {
        setDrawnCard(drawn);
      } else {
        setDrawnCard(null);
        setIsPlayerTurn(false);
      }
    }, 100);
  };

  // Pass turn after drawing (if drawn card is playable but player doesn't want to play it)
  const passTurn = () => {
    if (!drawnCard) return;
    setDrawnCard(null);
    setIsPlayerTurn(false);
  };

  // Win check + opponent UNO alert
  useEffect(() => {
    if (gameOver) return;
    if (playerHand.length === 0 && discard) endGame(currentPlayerObj.id);
    else if (opponentHand.length === 0 && discard) endGame(getOpponentId());
    else if (opponentHand.length === 1) {
      setUnoAlert(opponentName);
      setTimeout(() => setUnoAlert(null), 2000);
    }
  }, [playerHand.length, opponentHand.length, gameOver, discard, endGame]);

  // === Bot AI (offline only) ===
  useEffect(() => {
    if (isOnline) return;
    if (isPlayerTurn || gameOver) return;

    const timer = setTimeout(() => {
      const hand = opponentHandRef.current;
      const d = deckRef.current;
      const col = currentColorRef.current;
      const disc = discardRef.current;
      const currentStack = drawStackRef.current;
      const currentStackType = stackTypeRef.current;

      // If there's an active stack against the bot, try to counter or accept
      if (currentStack > 0 && currentStackType) {
        const counterIdx = hand.findIndex(c => c.type === currentStackType);
        if (counterIdx >= 0) {
          // Bot counters the stack!
          const card = hand[counterIdx];
          setDiscard(card);
          setOpponentHand(prev => prev.filter((_, i) => i !== counterIdx));
          if (card.color !== 'wild') {
            setCurrentColor(card.color as CardColor);
          } else {
            const colorCounts: Record<CardColor, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
            hand.filter((_, i) => i !== counterIdx).forEach(c => {
              if (c.color !== 'wild') colorCounts[c.color as CardColor]++;
            });
            const bestColor = (Object.entries(colorCounts) as [CardColor, number][])
              .sort((a, b) => b[1] - a[1])[0][0];
            setCurrentColor(bestColor);
          }
          SFX.cardPlay();
          const addAmount = currentStackType === 'draw2' ? 2 : 4;
          const newStack = currentStack + addAmount;
          setDrawStack(newStack);
          // Stack type stays the same, turn goes to player
          setIsPlayerTurn(true);
          return;
        } else {
          // Bot can't counter — accepts the full stack penalty
          setDeck(prev => {
            const available = prev.length >= currentStack ? prev : recycleDeck(prev, disc);
            const drawn = available.slice(0, currentStack);
            setOpponentHand(oh => [...oh, ...drawn]);
            return available.slice(currentStack);
          });
          SFX.cardDraw();
          setDrawStack(0);
          setStackType(null);
          setIsPlayerTurn(true);
          return;
        }
      }

      // Normal bot turn — try to find a playable card
      const playable = hand.findIndex(c => canPlayCardCheck(c, col, disc));

      if (playable >= 0) {
        const card = hand[playable];
        setDiscard(card);
        setOpponentHand(prev => prev.filter((_, i) => i !== playable));

        if (card.color !== 'wild') {
          setCurrentColor(card.color as CardColor);
        } else {
          const colorCounts: Record<CardColor, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
          hand.filter((_, i) => i !== playable).forEach(c => {
            if (c.color !== 'wild') colorCounts[c.color as CardColor]++;
          });
          const bestColor = (Object.entries(colorCounts) as [CardColor, number][])
            .sort((a, b) => b[1] - a[1])[0][0];
          setCurrentColor(bestColor);
        }
        SFX.cardPlay();

        // Stacking: +2 or +4 starts a stack instead of immediately drawing
        if (card.type === 'draw2') {
          setDrawStack(2);
          setStackType('draw2');
          setIsPlayerTurn(true);
          return;
        }
        if (card.type === 'wild4') {
          setDrawStack(4);
          setStackType('wild4');
          setIsPlayerTurn(true);
          return;
        }

        // In 2-player: skip/reverse give extra turn to bot
        if (card.type === 'skip' || card.type === 'reverse') {
          setBotTurnTrigger(prev => prev + 1);
          return;
        }
      } else {
        // No playable card — draw from deck
        const available = d.length > 0 ? d : recycleDeck(d, disc);
        if (available.length > 0) {
          const drawnCard = available[0];
          setDeck(available.slice(1));
          setOpponentHand(prev => [...prev, drawnCard]);
          SFX.cardDraw();

          // Bot tries to play drawn card if possible
          if (canPlayCardCheck(drawnCard, col, disc)) {
            setTimeout(() => {
              setDiscard(drawnCard);
              setOpponentHand(prev => prev.filter(c => c.id !== drawnCard.id));
              if (drawnCard.color !== 'wild') {
                setCurrentColor(drawnCard.color as CardColor);
              } else {
                setCurrentColor(colors[Math.floor(Math.random() * 4)]);
              }
              SFX.cardPlay();

              if (drawnCard.type === 'draw2') {
                setDrawStack(2);
                setStackType('draw2');
                setIsPlayerTurn(true);
                return;
              }
              if (drawnCard.type === 'wild4') {
                setDrawStack(4);
                setStackType('wild4');
                setIsPlayerTurn(true);
                return;
              }

              if (drawnCard.type === 'skip' || drawnCard.type === 'reverse') {
                setBotTurnTrigger(prev => prev + 1);
                return;
              }
              setIsPlayerTurn(true);
            }, 600);
            return;
          }
        }
      }
      setIsPlayerTurn(true);
    }, 800 + Math.random() * 600);

    return () => clearTimeout(timer);
  }, [isPlayerTurn, gameOver, isOnline, botTurnTrigger, recycleDeck]);

  return (
    <div className="uno-root">
      <div className="uno-scanline" />
      <div className="uno-topbar">
        <button className="uno-back-btn" onClick={() => navigate('/radar')}>
          <ArrowLeft size={14} />
          <span>Voltar</span>
        </button>
        <h1 className="uno-title">ARENA <span>UNO</span></h1>
        <div className="uno-round-label flex items-center gap-2">
          {isOnline && (
            connected
              ? <Wifi size={12} className="text-green-400" />
              : <WifiOff size={12} className="text-red-400" />
          )}
          {formatTime(playerTime + opponentTime)}
        </div>
      </div>
      <div className="uno-game-info">
        <div className={`uno-player ${!isPlayerTurn ? 'active' : ''}`}>
          <div className="uno-player-identity">
            <div className="uno-player-avatar">{opponentAvatar}</div>
            <span className="uno-player-name">{opponentName}</span>
          </div>
          <span className={`uno-player-time ${opponentTime <= 30 ? 'time-critical' : ''}`}>{formatTime(opponentTime)}</span>
        </div>
        <div className="uno-turn-indicator">
          <span className="uno-turn-label">Turno</span>
          <span className="uno-turn-text">
            {isPlayerTurn ? 'SUA VEZ' : 'VEZ DO OPONENTE'}
          </span>
          {isOnline && (
            <span className="mt-1" style={{ fontSize: '9px', color: connected ? '#4ade80' : '#f87171' }}>
              {connected ? '● ON' : '○ ...'}
            </span>
          )}
        </div>
        <div className={`uno-player ${isPlayerTurn ? 'active' : ''}`}>
          <div className="uno-player-identity">
            <div className="uno-player-avatar">{currentPlayerObj.avatar}</div>
            <span className="uno-player-name">{currentPlayerObj.name}</span>
          </div>
          <span className={`uno-player-time ${playerTime <= 30 ? 'time-critical' : ''}`}>{formatTime(playerTime)}</span>
        </div>
      </div>

      {/* Opponent hand (hidden) */}
      <div style={{ display: 'flex', gap: '4px', zIndex: 10, marginBottom: '8px' }}>
        {opponentHand.map((_, i) => <div key={i} className="uno-hidden-card" />)}
      </div>

      {/* Table: draw pile + discard + current color */}
      <div className="uno-table-area">
        <div style={{ position: 'relative' }}>
          <UnoCardComponent isBack onClick={drawnCard ? passTurn : drawCard} />
          {drawStack > 0 && isPlayerTurn && !drawnCard && (
            <div style={{
              position: 'absolute', top: '-24px', left: '50%', transform: 'translateX(-50%)',
              fontSize: '11px', fontWeight: 900, color: '#ff4444',
              whiteSpace: 'nowrap', textAlign: 'center',
              animation: 'pulse 0.8s infinite',
            }}>
              ACEITAR +{drawStack}
            </div>
          )}
          {drawnCard && (
            <div style={{
              position: 'absolute', top: '-20px', left: '50%', transform: 'translateX(-50%)',
              fontSize: '9px', fontWeight: 700, color: 'hsl(var(--primary))',
              whiteSpace: 'nowrap', textAlign: 'center',
            }}>
              PASSAR
            </div>
          )}
        </div>
        {discard && <UnoCardComponent card={discard} />}
        <div className={`uno-current-color ${currentColor}`} title={`Cor: ${currentColor}`} />
      </div>

      {/* Stack warning */}
      {drawStack > 0 && isPlayerTurn && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
          style={{ fontSize: '12px', color: '#ff4444', fontWeight: 900, marginTop: '4px' }}
        >
          ⚠️ Empilhamento ativo: +{drawStack}! Jogue um {stackType === 'draw2' ? '+2' : '+4'} ou compre {drawStack} cartas
        </motion.div>
      )}

      {/* Drawn card hint */}
      {drawnCard && isPlayerTurn && !drawStack && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
          style={{ fontSize: '11px', color: 'hsl(var(--primary))', fontWeight: 700, marginTop: '4px' }}
        >
          Jogue a carta comprada ou clique no monte para passar
        </motion.div>
      )}

      {/* UNO Call Button */}
      <AnimatePresence>
        {showUnoButton && !calledUno && isPlayerTurn && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="uno-call-button"
            onClick={handleCallUno}
          >
            UNO!
          </motion.button>
        )}
      </AnimatePresence>
      {calledUno && playerHand.length === 2 && (
        <div className="uno-called-indicator">✓ UNO CHAMADO!</div>
      )}

      {/* Player hand */}
      <div className="uno-hand-container">
        <div className="uno-hand">
          {playerHand.map((card, i) => (
            <UnoCardComponent
              key={card.id}
              card={card}
              onClick={() => handlePlay(i)}
              disabled={!isPlayerTurn || gameOver || (!!drawnCard && card.id !== drawnCard.id)}
            />
          ))}
        </div>
      </div>

      {/* Color picker modal */}
      {showColorPicker && (
        <div className="uno-color-modal">
          <div className="uno-color-modal-content">
            <p style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 700 }}>ESCOLHA A COR</p>
            <div className="uno-color-options">
              <button className="uno-color-btn red" onClick={() => handleColorChoice('red')}>VERMELHO</button>
              <button className="uno-color-btn blue" onClick={() => handleColorChoice('blue')}>AZUL</button>
              <button className="uno-color-btn green" onClick={() => handleColorChoice('green')}>VERDE</button>
              <button className="uno-color-btn yellow" onClick={() => handleColorChoice('yellow')}>AMARELO</button>
            </div>
          </div>
        </div>
      )}

      {/* UNO Alert */}
      <AnimatePresence>
        {unoAlert && (
          <motion.div
            initial={{ scale: 0, opacity: 0, rotate: -15 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            className="uno-alert-banner"
          >
            <span className="uno-alert-text">{unoAlert.includes('PENALIDADE') ? '😱' : 'UNO!'}</span>
            <span className="uno-alert-sub">{unoAlert}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over */}
      {gameOver && (
        <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="uno-gameover">
          🃏 FIM DE JOGO!
        </motion.div>
      )}

      <GameChat messages={chatMessages} onSend={sendChatMessage} currentPlayerId={currentPlayerObj.id} isOnline={isOnline} />
    </div>
  );
};

export default UnoGame;
