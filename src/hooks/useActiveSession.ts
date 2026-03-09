const SESSION_KEY = 'active_game_session';
export const MAX_AWAY_SECONDS = 10;

export interface ActiveSession {
  matchId: string;
  gameType: string;
  leftAt: number; // timestamp ms
  playerTime: number;
  opponentTime: number;
  isPlayerTurn: boolean;
}

export const saveActiveSession = (session: Omit<ActiveSession, 'leftAt'>) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, leftAt: Date.now() }));
};

export const getActiveSession = (): ActiveSession | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveSession;
  } catch {
    return null;
  }
};

export const clearActiveSession = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const getSecondsAway = (session: ActiveSession): number => {
  return Math.floor((Date.now() - session.leftAt) / 1000);
};
