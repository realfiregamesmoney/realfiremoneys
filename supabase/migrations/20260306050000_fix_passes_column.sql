
-- Adição da coluna faltante que está causando erro de "Motor Frio" nos jogos
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS passes_available INTEGER DEFAULT 0;

-- Sincronização opcional se a coluna antiga existir (para não perder dados dos usuários)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='races_available') THEN
        UPDATE public.profiles SET passes_available = races_available WHERE passes_available = 0 AND races_available > 0;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
