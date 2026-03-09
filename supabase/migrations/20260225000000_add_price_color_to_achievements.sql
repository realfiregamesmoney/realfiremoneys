-- Add price_color column to achievements table
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS price_color TEXT DEFAULT '#fb923c'; -- Default neon orange
