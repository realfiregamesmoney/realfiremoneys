-- Add button_color to tournaments table
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS button_color text DEFAULT 'orange';
