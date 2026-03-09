import { useEffect, useRef } from 'react';

interface UseRealtimeTurnTimerProps {
    isActive: boolean;
    isPlayerTurn: boolean;
    onPlayerTick: (elapsedSeconds: number) => void;
    onOpponentTick: (elapsedSeconds: number) => void;
}

/**
 * Wall-clock based timer that keeps clocks accurate even when the tab is throttled,
 * hidden, reloaded or resumed.
 */
export const useRealtimeTurnTimer = ({
    isActive,
    isPlayerTurn,
    onPlayerTick,
    onOpponentTick,
}: UseRealtimeTurnTimerProps) => {
    const onPlayerTickRef = useRef(onPlayerTick);
    const onOpponentTickRef = useRef(onOpponentTick);
    const isPlayerTurnRef = useRef(isPlayerTurn);
    const isActiveRef = useRef(isActive);
    const lastTickAtRef = useRef<number | null>(null);

    useEffect(() => {
        onPlayerTickRef.current = onPlayerTick;
        onOpponentTickRef.current = onOpponentTick;
    }, [onPlayerTick, onOpponentTick]);

    useEffect(() => {
        isPlayerTurnRef.current = isPlayerTurn;
    }, [isPlayerTurn]);

    useEffect(() => {
        isActiveRef.current = isActive;
        if (isActive) {
            if (lastTickAtRef.current === null) lastTickAtRef.current = Date.now();
            return;
        }
        lastTickAtRef.current = null;
    }, [isActive]);

    useEffect(() => {
        const flushElapsed = () => {
            if (!isActiveRef.current) return;

            const now = Date.now();
            if (lastTickAtRef.current === null) {
                lastTickAtRef.current = now;
                return;
            }

            const elapsedSeconds = Math.floor((now - lastTickAtRef.current) / 1000);
            if (elapsedSeconds <= 0) return;

            lastTickAtRef.current += elapsedSeconds * 1000;

            if (isPlayerTurnRef.current) {
                onPlayerTickRef.current(elapsedSeconds);
            } else {
                onOpponentTickRef.current(elapsedSeconds);
            }
        };

        const interval = setInterval(flushElapsed, 250);
        const handleWakeUp = () => flushElapsed();

        window.addEventListener('focus', handleWakeUp);
        window.addEventListener('pageshow', handleWakeUp);
        document.addEventListener('visibilitychange', handleWakeUp);

        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', handleWakeUp);
            window.removeEventListener('pageshow', handleWakeUp);
            document.addEventListener('visibilitychange', handleWakeUp);
        };
    }, []);
};
