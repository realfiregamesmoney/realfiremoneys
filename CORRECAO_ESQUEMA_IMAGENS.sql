-- Verificação do schema e reparo final
DO $$
BEGIN
    -- Garantir que as colunas existem
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quiz_events' AND column_name = 'banner_url') THEN
        ALTER TABLE public.quiz_events ADD COLUMN banner_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quiz_events' AND column_name = 'prize_product_image') THEN
        ALTER TABLE public.quiz_events ADD COLUMN prize_product_image TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quiz_events' AND column_name = 'is_prize_fixed') THEN
        ALTER TABLE public.quiz_events ADD COLUMN is_prize_fixed BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Forçar reload do cache do PostgREST
NOTIFY pgrst, 'reload schema';
