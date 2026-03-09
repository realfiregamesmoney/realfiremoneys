
-- Garantir colunas no vault_events
ALTER TABLE public.vault_events 
ADD COLUMN IF NOT EXISTS prize_type text DEFAULT 'cash',
ADD COLUMN IF NOT EXISTS prize_product_name text,
ADD COLUMN IF NOT EXISTS prize_product_image text,
ADD COLUMN IF NOT EXISTS show_estimated_value boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS estimated_prize_value numeric DEFAULT 0;

-- Garantir colunas no vault_packages
ALTER TABLE public.vault_packages 
ADD COLUMN IF NOT EXISTS button_text text DEFAULT 'ADQUIRIR AGORA',
ADD COLUMN IF NOT EXISTS highlight_color text DEFAULT '#eab308',
ADD COLUMN IF NOT EXISTS is_glowing boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS text_color text DEFAULT '#ffffff';

-- Garantir colunas no vault_hints
ALTER TABLE public.vault_hints
ADD COLUMN IF NOT EXISTS unlock_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false;

-- Notificar o PostgREST para atualizar o cache do esquema
NOTIFY pgrst, 'reload schema';
