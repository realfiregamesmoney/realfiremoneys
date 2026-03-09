
-- SOLUÇÃO ATÔMICA: RECONSTRUÇÃO DE VISIBILIDADE DO ESQUEMA
-- Execute este script INTEGRALMENTE no SQL Editor do Supabase

DO $$ 
BEGIN
    -- 1. GARANTIR TODAS AS COLUNAS EM vault_events
    PERFORM 1 FROM pg_attribute WHERE attrelid = 'public.vault_events'::regclass AND attname = 'prize_product_image';
    IF NOT FOUND THEN
        ALTER TABLE public.vault_events ADD COLUMN prize_product_image text;
    END IF;

    PERFORM 1 FROM pg_attribute WHERE attrelid = 'public.vault_events'::regclass AND attname = 'prize_product_name';
    IF NOT FOUND THEN
        ALTER TABLE public.vault_events ADD COLUMN prize_product_name text;
    END IF;

    PERFORM 1 FROM pg_attribute WHERE attrelid = 'public.vault_events'::regclass AND attname = 'prize_type';
    IF NOT FOUND THEN
        ALTER TABLE public.vault_events ADD COLUMN prize_type text DEFAULT 'cash';
    END IF;

    PERFORM 1 FROM pg_attribute WHERE attrelid = 'public.vault_events'::regclass AND attname = 'show_estimated_value';
    IF NOT FOUND THEN
        ALTER TABLE public.vault_events ADD COLUMN show_estimated_value boolean DEFAULT true;
    END IF;

    PERFORM 1 FROM pg_attribute WHERE attrelid = 'public.vault_events'::regclass AND attname = 'estimated_prize_value';
    IF NOT FOUND THEN
        ALTER TABLE public.vault_events ADD COLUMN estimated_prize_value numeric DEFAULT 0;
    END IF;

    -- 2. GARANTIR TODAS AS COLUNAS EM vault_hints
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vault_hints' AND column_name = 'is_premium') THEN
        ALTER TABLE public.vault_hints ADD COLUMN is_premium boolean DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vault_hints' AND column_name = 'unlock_price') THEN
        ALTER TABLE public.vault_hints ADD COLUMN unlock_price numeric DEFAULT 0;
    END IF;

    -- 3. GARANTIR TODAS AS COLUNAS EM vault_packages
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vault_packages' AND column_name = 'is_glowing') THEN
        ALTER TABLE public.vault_packages ADD COLUMN is_glowing boolean DEFAULT true;
    END IF;
END $$;

-- 4. FORÇAR REGENERAÇÃO DO ESQUEMA (Derrubar e recriar permissões é o método mais eficaz)
REVOKE ALL ON TABLE public.vault_events FROM anon, authenticated;
REVOKE ALL ON TABLE public.vault_hints FROM anon, authenticated;
REVOKE ALL ON TABLE public.vault_packages FROM anon, authenticated;

GRANT ALL ON TABLE public.vault_events TO postgres, service_role, authenticated;
GRANT ALL ON TABLE public.vault_hints TO postgres, service_role, authenticated;
GRANT ALL ON TABLE public.vault_packages TO postgres, service_role, authenticated;

GRANT SELECT ON TABLE public.vault_events TO anon;
GRANT SELECT ON TABLE public.vault_hints TO anon;
GRANT SELECT ON TABLE public.vault_packages TO anon;

-- 5. O GATILHO DE RECARREGAMENTO DEFINITIVO
NOTIFY pgrst, 'reload schema';

-- 6. COMENTÁRIO PARA FORÇAR INVALIDAÇÃO DE CACHE
COMMENT ON TABLE public.vault_events IS 'Vault Events System - Last Sync: ' || now();
COMMENT ON TABLE public.vault_hints IS 'Vault Hints System - Last Sync: ' || now();
