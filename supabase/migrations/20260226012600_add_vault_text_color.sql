
-- Add text_color to vault_packages
ALTER TABLE public.vault_packages 
ADD COLUMN IF NOT EXISTS text_color text DEFAULT '#ffffff';
