
-- SOLUÇÃO ATÔMICA V3: RECONSTRUÇÃO DE VISIBILIDADE DO ESQUEMA (VERSÃO CORRIGIDA)
-- Execute este script INTEGRALMENTE no SQL Editor do Supabase

DO $$ 
BEGIN
    -- 1. GARANTIR TODAS AS COLUNAS EM vault_events
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vault_events' AND column_name = 'prize_product_image') THEN
        ALTER TABLE public.vault_events ADD COLUMN prize_product_image text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vault_events' AND column_name = 'prize_product_name') THEN
        ALTER TABLE public.vault_events ADD COLUMN prize_product_name text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vault_events' AND column_name = 'prize_type') THEN
        ALTER TABLE public.vault_events ADD COLUMN prize_type text DEFAULT 'cash';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vault_events' AND column_name = 'show_estimated_value') THEN
        ALTER TABLE public.vault_events ADD COLUMN show_estimated_value boolean DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vault_events' AND column_name = 'estimated_prize_value') THEN
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

    -- 4. FORÇAR INVALIDAÇÃO DE CACHE VIA COMENTÁRIO DENTRO DO BLOCO
    EXECUTE 'COMMENT ON TABLE public.vault_events IS ''Vault Events System - Sync ' || now() || '''';
    EXECUTE 'COMMENT ON TABLE public.vault_hints IS ''Vault Hints System - Sync ' || now() || '''';
    EXECUTE 'COMMENT ON TABLE public.vault_packages IS ''Vault Packages System - Sync ' || now() || '''';

END $$;

-- 5. RE-GARANTIR PERMISSÕES (Reset de visibilidade)
GRANT ALL ON TABLE public.vault_events TO postgres, service_role, authenticated;
GRANT ALL ON TABLE public.vault_hints TO postgres, service_role, authenticated;
GRANT ALL ON TABLE public.vault_packages TO postgres, service_role, authenticated;

GRANT SELECT ON TABLE public.vault_events TO anon;
GRANT SELECT ON TABLE public.vault_hints TO anon;
GRANT SELECT ON TABLE public.vault_packages TO anon;

-- 6. O GATILHO DE RECARREGAMENTO DEFINITIVO
NOTIFY pgrst, 'reload schema';
