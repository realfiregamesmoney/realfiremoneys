
-- SOLUÇÃO DEFINITIVA PARA COLUNAS FALTANTES NO SCHEMA CACHE
DO $$ 
BEGIN
    -- Forçar coluna is_premium em vault_hints
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vault_hints' AND column_name = 'is_premium') THEN
        ALTER TABLE public.vault_hints ADD COLUMN is_premium boolean DEFAULT false;
    END IF;

    -- Forçar coluna unlock_price em vault_hints (dependência da lógica de premium)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vault_hints' AND column_name = 'unlock_price') THEN
        ALTER TABLE public.vault_hints ADD COLUMN unlock_price numeric DEFAULT 0;
    END IF;
END $$;

-- COMANDO CRÍTICO: Recarregar o cache do PostgREST para que o Supabase enxergue as novas colunas
NOTIFY pgrst, 'reload schema';
