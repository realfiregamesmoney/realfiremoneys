
-- Update Vault Packages for customization
ALTER TABLE public.vault_packages 
ADD COLUMN IF NOT EXISTS button_text text DEFAULT 'ADQUIRIR AGORA',
ADD COLUMN IF NOT EXISTS highlight_color text DEFAULT 'yellow',
ADD COLUMN IF NOT EXISTS is_glowing boolean DEFAULT true;
