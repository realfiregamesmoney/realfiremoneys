
-- SOLUÇÃO DEFINITIVA E AGRESSIVA PARA COLUNAS FALTANTES E CACHE DO SUPABASE
-- Este script força a reconstrução da visibilidade do esquema para o PostgREST (API)

DO $$ 
BEGIN
    -- 1. GARANTIR COLUNAS EM vault_events
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vault_events' AND column_name = 'estimated_prize_value') THEN
        ALTER TABLE public.vault_events ADD COLUMN estimated_prize_value numeric DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vault_events' AND column_name = 'prize_type') THEN
        ALTER TABLE public.vault_events ADD COLUMN prize_type text DEFAULT 'cash';
    END IF;

    -- 2. GARANTIR COLUNAS EM vault_hints
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vault_hints' AND column_name = 'is_premium') THEN
        ALTER TABLE public.vault_hints ADD COLUMN is_premium boolean DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vault_hints' AND column_name = 'unlock_price') THEN
        ALTER TABLE public.vault_hints ADD COLUMN unlock_price numeric DEFAULT 0;
    END IF;

    -- 3. GARANTIR COLUNAS EM vault_packages
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vault_packages' AND column_name = 'is_glowing') THEN
        ALTER TABLE public.vault_packages ADD COLUMN is_glowing boolean DEFAULT true;
    END IF;
END $$;

-- 4. TRUQUE DE FORÇA BRUTA PARA RECARREGAR O CACHE DO ESQUEMA
-- Mudar o comentário da tabela força o PostgREST a re-indexar os metadados da tabela
COMMENT ON TABLE public.vault_events IS 'Sistema de Cofres Real Fire - Atualizado em 2026-02-26';
COMMENT ON TABLE public.vault_hints IS 'Sistema de Dicas Real Fire - Atualizado em 2026-02-26';
COMMENT ON TABLE public.vault_packages IS 'Pacotes de Palpites Real Fire - Atualizado em 2026-02-26';

-- 5. RE-GARANTIR PERMISSÕES (Às vezes o erro de cache é falta de SELECT/UPDATE na coluna)
GRANT ALL ON TABLE public.vault_events TO authenticated, service_role, postgres;
GRANT ALL ON TABLE public.vault_hints TO authenticated, service_role, postgres;
GRANT ALL ON TABLE public.vault_packages TO authenticated, service_role, postgres;

-- 6. COMANDO OFICIAL DE RELOAD
NOTIFY pgrst, 'reload schema';

-- 7. RESET DE CACHE EXTRA (Caso o NOTIFY falhe em ambientes específicos)
-- No Supabase, às vezes é necessário rodar um comando que altere levemente o esquema para forçar o reload
ALTER TABLE public.vault_events ALTER COLUMN estimated_prize_value SET DEFAULT 0;
ALTER TABLE public.vault_hints ALTER COLUMN is_premium SET DEFAULT false;
