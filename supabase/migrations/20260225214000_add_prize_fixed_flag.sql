-- Add is_prize_fixed column to quiz_events
ALTER TABLE public.quiz_events 
ADD COLUMN IF NOT EXISTS is_prize_fixed BOOLEAN DEFAULT FALSE;

-- Refresh cache
NOTIFY pgrst, 'reload schema';
