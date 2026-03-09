// Re-export from generic hook for backwards compatibility
import { useGameRealtime, GameMove } from './useGameRealtime';

export type CheckersMove = {
    fromR: number;
    fromC: number;
    toR: number;
    toC: number;
    playerId: string;
    timestamp: number;
};

interface UseCheckersRealtimeProps {
    matchId: string | null;
    playerId: string;
    isOnline: boolean;
    onOpponentMove: (move: CheckersMove) => void;
}

export const useCheckersRealtime = ({
    matchId,
    playerId,
    isOnline,
    onOpponentMove,
}: UseCheckersRealtimeProps) => {
    const { sendMove: genericSend, connected } = useGameRealtime({
        matchId,
        playerId,
        isOnline,
        onOpponentMove: (move: GameMove) => {
            onOpponentMove({
                fromR: move.data.fromR,
                fromC: move.data.fromC,
                toR: move.data.toR,
                toC: move.data.toC,
                playerId: move.playerId,
                timestamp: move.timestamp,
            });
        },
    });

    const sendMove = async (move: Omit<CheckersMove, 'playerId' | 'timestamp'>) => {
        await genericSend('move', move);
    };

    return { sendMove, connected };
};
