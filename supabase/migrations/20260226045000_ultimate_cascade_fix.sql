-- SOLUÇÃO SUPREMA V3: REMOÇÃO DE TODAS AS TRAVAS DE INTEGRIDADE DO COFRE
-- Este script limpa e recria todas as chaves estrangeiras com ON DELETE CASCADE.
-- EXECUTE ESTE SCRIPT INTEGRALMENTE NO SQL EDITOR DO SUPABASE.

DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- 1. LIMPEZA PARA vault_guesses
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vault_guesses') THEN
        FOR r IN (
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'vault_guesses' AND constraint_type = 'FOREIGN KEY'
        ) LOOP
            EXECUTE 'ALTER TABLE public.vault_guesses DROP CONSTRAINT IF EXISTS ' || r.constraint_name || ' CASCADE';
        END LOOP;
        
        ALTER TABLE public.vault_guesses 
        ADD CONSTRAINT vault_guesses_vault_id_fkey 
        FOREIGN KEY (vault_id) REFERENCES public.vault_events(id) ON DELETE CASCADE;
    END IF;

    -- 2. LIMPEZA PARA vault_hints
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vault_hints') THEN
        FOR r IN (
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'vault_hints' AND constraint_type = 'FOREIGN KEY'
        ) LOOP
            EXECUTE 'ALTER TABLE public.vault_hints DROP CONSTRAINT IF EXISTS ' || r.constraint_name || ' CASCADE';
        END LOOP;

        ALTER TABLE public.vault_hints 
        ADD CONSTRAINT vault_hints_vault_id_fkey 
        FOREIGN KEY (vault_id) REFERENCES public.vault_events(id) ON DELETE CASCADE;
    END IF;

    -- 3. LIMPEZA PARA vault_unlocked_hints
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vault_unlocked_hints') THEN
        FOR r IN (
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'vault_unlocked_hints' AND constraint_type = 'FOREIGN KEY'
        ) LOOP
            EXECUTE 'ALTER TABLE public.vault_unlocked_hints DROP CONSTRAINT IF EXISTS ' || r.constraint_name || ' CASCADE';
        END LOOP;

        ALTER TABLE public.vault_unlocked_hints 
        ADD CONSTRAINT vault_unlocked_hints_vault_id_fkey 
        FOREIGN KEY (vault_id) REFERENCES public.vault_events(id) ON DELETE CASCADE;
    END IF;

    -- 4. LIMPEZA PARA vault_user_attempts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vault_user_attempts') THEN
        FOR r IN (
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'vault_user_attempts' AND constraint_type = 'FOREIGN KEY'
        ) LOOP
            EXECUTE 'ALTER TABLE public.vault_user_attempts DROP CONSTRAINT IF EXISTS ' || r.constraint_name || ' CASCADE';
        END LOOP;

        ALTER TABLE public.vault_user_attempts 
        ADD CONSTRAINT vault_user_attempts_vault_id_fkey 
        FOREIGN KEY (vault_id) REFERENCES public.vault_events(id) ON DELETE CASCADE;
    END IF;

    -- 5. FORÇAR INVALIDAÇÃO DE CACHE DE ESQUEMA
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vault_events') THEN
        COMMENT ON TABLE public.vault_events IS 'Vault System Updated v3';
    END IF;
    
END $$;

-- NOTIFY deve estar fora do bloco DO $$ em alguns ambientes
NOTIFY pgrst, 'reload schema';
