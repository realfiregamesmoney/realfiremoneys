-- Final fix for missing columns in tournaments table
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS extra_text text,
ADD COLUMN IF NOT EXISTS max_level integer,
ADD COLUMN IF NOT EXISTS prize_distribution text DEFAULT 'winner',
ADD COLUMN IF NOT EXISTS button_color text DEFAULT 'orange';

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
