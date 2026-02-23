-- Knowledge Vault (Cofre do Conhecimento) System
CREATE TABLE IF NOT EXISTS public.vault_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text, -- The Riddle
    correct_password text NOT NULL, -- Hashed or encrypted
    prize_pool numeric DEFAULT 0,
    status text DEFAULT 'inactive', -- active, finished, inactive
    winner_id uuid REFERENCES public.profiles(user_id),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.vault_hints (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    vault_id uuid REFERENCES public.vault_events(id) ON DELETE CASCADE,
    hint_text text NOT NULL,
    reveal_at timestamp with time zone NOT NULL,
    is_revealed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.vault_user_attempts (
    user_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    vault_id uuid REFERENCES public.vault_events(id) ON DELETE CASCADE,
    attempts_remaining integer DEFAULT 0,
    PRIMARY KEY (user_id, vault_id)
);

CREATE TABLE IF NOT EXISTS public.vault_guesses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(user_id),
    vault_id uuid REFERENCES public.vault_events(id),
    guess text NOT NULL,
    is_correct boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.vault_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_hints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_user_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_guesses ENABLE ROW LEVEL SECURITY;

-- Policies for vault_events
CREATE POLICY "Vault events are viewable by everyone" ON public.vault_events FOR SELECT USING (true);
CREATE POLICY "Admins can manage vault events" ON public.vault_events FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Policies for vault_hints
CREATE POLICY "Revealed hints are viewable by everyone" ON public.vault_hints FOR SELECT USING (
    is_revealed = true OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can manage vault hints" ON public.vault_hints FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Policies for vault_user_attempts
CREATE POLICY "Users can view their own attempts" ON public.vault_user_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all attempts" ON public.vault_user_attempts FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Policies for vault_guesses
CREATE POLICY "Users can view their own guesses" ON public.vault_guesses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all guesses" ON public.vault_guesses FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Users can insert their own guesses" ON public.vault_guesses FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_vault_updated_at
BEFORE UPDATE ON public.vault_events
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Realtime enablement
ALTER PUBLICATION supabase_realtime ADD TABLE public.vault_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vault_hints;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vault_user_attempts;
