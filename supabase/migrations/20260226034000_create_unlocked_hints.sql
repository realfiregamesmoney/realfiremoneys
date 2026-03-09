-- Create vault_unlocked_hints table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.vault_unlocked_hints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vault_id UUID NOT NULL REFERENCES public.vault_events(id) ON DELETE CASCADE,
    hint_id UUID NOT NULL REFERENCES public.vault_hints(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, hint_id)
);

-- RLS
ALTER TABLE public.vault_unlocked_hints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own unlocked hints"
    ON public.vault_unlocked_hints FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own unlocked hints"
    ON public.vault_unlocked_hints FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Ensure schema cache is reloaded
NOTIFY pgrst, 'reload schema';
