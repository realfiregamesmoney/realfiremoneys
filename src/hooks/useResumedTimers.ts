import { getActiveSession, getSecondsAway, MAX_AWAY_SECONDS } from './useActiveSession';

interface UseResumedTimersResult {
    initialPlayerTime: number;
    initialOpponentTime: number;
    initialIsPlayerTurn: boolean;
    shouldAutoLose: boolean;
}

interface GetResumedTimersOptions {
    defaultTime?: number;
    gameType?: string;
    defaultIsPlayerTurn?: boolean;
}

/**
 * On mount, checks for a saved active session matching this matchId.
 * - If found within 30s: returns restored timers (minus away time from the active player's clock)
 * - If found but >30s: returns shouldAutoLose = true
 * - Otherwise: returns default times
 */
export const getResumedTimers = (
    matchId: string,
    { defaultTime = 300, gameType, defaultIsPlayerTurn = true }: GetResumedTimersOptions = {}
): UseResumedTimersResult => {
    const session = getActiveSession();

    if (!session) {
        return {
            initialPlayerTime: defaultTime,
            initialOpponentTime: defaultTime,
            initialIsPlayerTurn: defaultIsPlayerTurn,
            shouldAutoLose: false,
        };
    }

    const sameMatch = session.matchId === matchId;
    const canRecoverLocal = matchId === 'local' && !!gameType && session.gameType === gameType;

    if (!sameMatch && !canRecoverLocal) {
        return {
            initialPlayerTime: defaultTime,
            initialOpponentTime: defaultTime,
            initialIsPlayerTurn: defaultIsPlayerTurn,
            shouldAutoLose: false,
        };
    }

    const secondsAway = getSecondsAway(session);

    if (secondsAway > MAX_AWAY_SECONDS) {
        return {
            initialPlayerTime: session.playerTime,
            initialOpponentTime: session.opponentTime,
            initialIsPlayerTurn: session.isPlayerTurn,
            shouldAutoLose: true,
        };
    }

    const restoredPlayerTime = session.isPlayerTurn
        ? Math.max(0, session.playerTime - secondsAway)
        : session.playerTime;
    const restoredOpponentTime = session.isPlayerTurn
        ? session.opponentTime
        : Math.max(0, session.opponentTime - secondsAway);

    if (restoredPlayerTime <= 0 || restoredOpponentTime <= 0) {
        return {
            initialPlayerTime: restoredPlayerTime,
            initialOpponentTime: restoredOpponentTime,
            initialIsPlayerTurn: session.isPlayerTurn,
            shouldAutoLose: true,
        };
    }

    return {
        initialPlayerTime: restoredPlayerTime,
        initialOpponentTime: restoredOpponentTime,
        initialIsPlayerTurn: session.isPlayerTurn,
        shouldAutoLose: false,
    };
};
