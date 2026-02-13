-- Add is_featured column to tournaments table
ALTER TABLE public.tournaments ADD COLUMN is_featured boolean NOT NULL DEFAULT false;

-- Create a function to ensure only one featured tournament at a time
CREATE OR REPLACE FUNCTION public.ensure_single_featured_tournament()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_featured = true THEN
    UPDATE public.tournaments SET is_featured = false WHERE id != NEW.id AND is_featured = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER ensure_single_featured
BEFORE INSERT OR UPDATE ON public.tournaments
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_featured_tournament();