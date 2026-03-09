-- Migration to add counts to user achievements and define rules
ALTER TABLE public.user_achievements ADD COLUMN IF NOT EXISTS count INTEGER DEFAULT 0;

-- Ensure count doesn't fall below 0
ALTER TABLE public.user_achievements ADD CONSTRAINT user_achievements_count_non_negative CHECK (count >= 0);

-- Trigger to notify when counts change (for realtime updates in UI)
CREATE OR REPLACE FUNCTION notify_user_achievement_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('pgrst', json_build_object('table', 'user_achievements', 'id', NEW.id)::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_notify_user_achievement_change ON public.user_achievements;
CREATE TRIGGER tr_notify_user_achievement_change
AFTER UPDATE ON public.user_achievements
FOR EACH ROW EXECUTE FUNCTION notify_user_achievement_change();
