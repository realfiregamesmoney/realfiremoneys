-- Migration to add pre-reveal title to vault hints
ALTER TABLE public.vault_hints ADD COLUMN IF NOT EXISTS pre_reveal_title text DEFAULT 'INFORMAÇÃO CRIPTOGRAFADA';

-- Force schema reload
NOTIFY pgrst, 'reload schema';
