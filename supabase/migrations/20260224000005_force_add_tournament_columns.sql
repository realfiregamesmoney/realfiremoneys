ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS prize_distribution text DEFAULT 'winner';
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS button_color text DEFAULT 'orange';
