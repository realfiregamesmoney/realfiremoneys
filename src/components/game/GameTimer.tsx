import { useEffect, useRef, useState } from 'react';

interface GameTimerProps {
  playerTime: number;
  opponentTime: number;
  isPlayerTurn: boolean;
  onPlayerTimeChange: (t: number) => void;
  onOpponentTimeChange: (t: number) => void;
  onTimeUp: (who: 'player' | 'opponent') => void;
  gameOver: boolean;
  playerName: string;
  opponentName: string;
  playerAvatar: string;
  opponentAvatar: string;
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const GameTimer = ({
  playerTime, opponentTime, isPlayerTurn,
  onPlayerTimeChange, onOpponentTimeChange,
  onTimeUp, gameOver, playerName, opponentName,
  playerAvatar, opponentAvatar,
}: GameTimerProps) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const totalTime = playerTime + opponentTime;

  useEffect(() => {
    if (gameOver) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      if (isPlayerTurn) {
        onPlayerTimeChange(Math.max(0, playerTime - 1));
        if (playerTime <= 1) onTimeUp('player');
      } else {
        onOpponentTimeChange(Math.max(0, opponentTime - 1));
        if (opponentTime <= 1) onTimeUp('opponent');
      }
    }, 1000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlayerTurn, playerTime, opponentTime, gameOver]);

  return (
    <div className="flex items-center gap-3 md:gap-6">
      {/* Opponent */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all border ${
        !isPlayerTurn ? 'bg-primary/10 border-primary/50 glow-primary' : 'bg-card border-border'
      }`}>
        <div className="w-10 h-10 rounded-full bg-secondary border-2 border-primary/50 flex items-center justify-center text-lg">
          {opponentAvatar}
        </div>
        <div className="flex flex-col items-start">
          <span className="text-xs font-heading text-muted-foreground">{opponentName}</span>
          <span className={`font-display text-lg ${!isPlayerTurn ? 'text-primary' : 'text-muted-foreground'}`}>
            {formatTime(opponentTime)}
          </span>
        </div>
      </div>

      {/* Total timer */}
      <div className="flex flex-col items-center">
        <span className="text-[10px] font-display text-muted-foreground tracking-widest uppercase">Total</span>
        <span className="font-display text-2xl text-foreground font-bold">{formatTime(totalTime)}</span>
        <span className={`text-[10px] font-heading ${isPlayerTurn ? 'text-primary' : 'text-muted-foreground'}`}>
          {isPlayerTurn ? 'SUA VEZ' : 'VEZ DO OPONENTE'}
        </span>
      </div>

      {/* Player */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all border ${
        isPlayerTurn ? 'bg-primary/10 border-primary/50 glow-primary' : 'bg-card border-border'
      }`}>
        <div className="flex flex-col items-end">
          <span className="text-xs font-heading text-muted-foreground">{playerName}</span>
          <span className={`font-display text-lg ${isPlayerTurn ? 'text-primary' : 'text-muted-foreground'}`}>
            {formatTime(playerTime)}
          </span>
        </div>
        <div className="w-10 h-10 rounded-full bg-secondary border-2 border-primary/50 flex items-center justify-center text-lg">
          {playerAvatar}
        </div>
      </div>
    </div>
  );
};

export default GameTimer;
