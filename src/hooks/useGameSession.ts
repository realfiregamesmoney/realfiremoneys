import { useEffect, useRef } from 'react';
import { saveActiveSession, clearActiveSession } from './useActiveSession';

interface UseGameSessionProps {
    matchId: string;
    gameType: string;
    playerTime: number;
    opponentTime: number;
    isPlayerTurn: boolean;
    gameOver: boolean;
}

/**
 * Tracks the active game session. On page leave (beforeunload / visibilitychange),
 * saves session info so the player can return within 30s.
 * Clears session when game is over.
 */
export const useGameSession = ({ matchId, gameType, playerTime, opponentTime, isPlayerTurn, gameOver }: UseGameSessionProps) => {
    const stateRef = useRef({ matchId, gameType, playerTime, opponentTime, isPlayerTurn, gameOver });

    useEffect(() => {
        stateRef.current = { matchId, gameType, playerTime, opponentTime, isPlayerTurn, gameOver };
    }, [matchId, gameType, playerTime, opponentTime, isPlayerTurn, gameOver]);

    useEffect(() => {
        if (gameOver) {
            clearActiveSession();
            return;
        }

        const save = () => {
            if (stateRef.current.gameOver) return;
            saveActiveSession({
                matchId: stateRef.current.matchId,
                gameType: stateRef.current.gameType,
                playerTime: stateRef.current.playerTime,
                opponentTime: stateRef.current.opponentTime,
                isPlayerTurn: stateRef.current.isPlayerTurn,
            });
        };

        const handleBeforeUnload = () => save();
        const handleVisibility = () => {
            if (document.visibilityState === 'hidden') save();
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('visibilitychange', handleVisibility);

        // Also save periodically so any navigation away is covered
        const interval = setInterval(save, 2000);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibility);
            clearInterval(interval);
            // On unmount (navigating away from game), save session
            save();
        };
    }, [gameOver]);

    // Clear session explicitly when game ends
    useEffect(() => {
        if (gameOver) clearActiveSession();
    }, [gameOver]);
};
