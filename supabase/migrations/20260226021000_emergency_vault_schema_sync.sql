
DO $$ 
BEGIN
    -- Corretivo para vault_events
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vault_events' AND column_name = 'prize_type') THEN
        ALTER TABLE public.vault_events ADD COLUMN prize_type text DEFAULT 'cash';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vault_events' AND column_name = 'prize_product_name') THEN
        ALTER TABLE public.vault_events ADD COLUMN prize_product_name text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vault_events' AND column_name = 'prize_product_image') THEN
        ALTER TABLE public.vault_events ADD COLUMN prize_product_image text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vault_events' AND column_name = 'show_estimated_value') THEN
        ALTER TABLE public.vault_events ADD COLUMN show_estimated_value boolean DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vault_events' AND column_name = 'estimated_prize_value') THEN
        ALTER TABLE public.vault_events ADD COLUMN estimated_prize_value numeric DEFAULT 0;
    END IF;

    -- Corretivo para vault_packages
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vault_packages' AND column_name = 'button_text') THEN
        ALTER TABLE public.vault_packages ADD COLUMN button_text text DEFAULT 'ADQUIRIR AGORA';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vault_packages' AND column_name = 'highlight_color') THEN
        ALTER TABLE public.vault_packages ADD COLUMN highlight_color text DEFAULT '#eab308';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vault_packages' AND column_name = 'is_glowing') THEN
        ALTER TABLE public.vault_packages ADD COLUMN is_glowing boolean DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vault_packages' AND column_name = 'text_color') THEN
        ALTER TABLE public.vault_packages ADD COLUMN text_color text DEFAULT '#ffffff';
    END IF;

    -- Corretivo para vault_hints
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vault_hints' AND column_name = 'unlock_price') THEN
        ALTER TABLE public.vault_hints ADD COLUMN unlock_price numeric DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vault_hints' AND column_name = 'is_premium') THEN
        ALTER TABLE public.vault_hints ADD COLUMN is_premium boolean DEFAULT false;
    END IF;
END $$;

-- Resolve problema de cache do PostgREST
NOTIFY pgrst, 'reload schema';
