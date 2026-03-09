-- Protocolo de Correção Definitiva: Cascateamento de Deleção (ON DELETE CASCADE)
-- Este script remove as travas que impedem a exclusão de cofres e automatiza a limpeza.

DO $$ 
BEGIN
    -- 1. CORREÇÃO PARA vault_guesses (O erro relatado)
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'vault_guesses_vault_id_fkey') THEN
        ALTER TABLE public.vault_guesses DROP CONSTRAINT vault_guesses_vault_id_fkey;
    END IF;
    ALTER TABLE public.vault_guesses 
    ADD CONSTRAINT vault_guesses_vault_id_fkey 
    FOREIGN KEY (vault_id) REFERENCES public.vault_events(id) ON DELETE CASCADE;

    -- 2. CORREÇÃO PARA vault_hints
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'vault_hints_vault_id_fkey') THEN
        ALTER TABLE public.vault_hints DROP CONSTRAINT vault_hints_vault_id_fkey;
    END IF;
    ALTER TABLE public.vault_hints 
    ADD CONSTRAINT vault_hints_vault_id_fkey 
    FOREIGN KEY (vault_id) REFERENCES public.vault_events(id) ON DELETE CASCADE;

    -- 3. CORREÇÃO PARA vault_unlocked_hints
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'vault_unlocked_hints_vault_id_fkey') THEN
        ALTER TABLE public.vault_unlocked_hints DROP CONSTRAINT vault_unlocked_hints_vault_id_fkey;
    END IF;
    ALTER TABLE public.vault_unlocked_hints 
    ADD CONSTRAINT vault_unlocked_hints_vault_id_fkey 
    FOREIGN KEY (vault_id) REFERENCES public.vault_events(id) ON DELETE CASCADE;

    -- 4. CORREÇÃO PARA vault_user_attempts
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'vault_user_attempts_vault_id_fkey') THEN
        ALTER TABLE public.vault_user_attempts DROP CONSTRAINT vault_user_attempts_vault_id_fkey;
    END IF;
    ALTER TABLE public.vault_user_attempts 
    ADD CONSTRAINT vault_user_attempts_vault_id_fkey 
    FOREIGN KEY (vault_id) REFERENCES public.vault_events(id) ON DELETE CASCADE;

END $$;

-- Forçar atualização do cache do esquema
NOTIFY pgrst, 'reload schema';
