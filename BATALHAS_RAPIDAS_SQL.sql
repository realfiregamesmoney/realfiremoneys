CREATE TABLE IF NOT EXISTS public.chat_battles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.profiles(user_id),
    format_type TEXT NOT NULL, 
    max_players_per_team INTEGER NOT NULL,
    entry_fee NUMERIC NOT NULL,
    status TEXT DEFAULT 'open', 
    room_link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_battle_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    battle_id UUID REFERENCES public.chat_battles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    team TEXT NOT NULL, 
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(battle_id, user_id)
);

ALTER TABLE public.chat_battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_battle_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "everyone_read_battles" ON public.chat_battles;
CREATE POLICY "everyone_read_battles" ON public.chat_battles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_all_battles" ON public.chat_battles;
CREATE POLICY "admin_all_battles" ON public.chat_battles FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);

DROP POLICY IF EXISTS "everyone_read_participants" ON public.chat_battle_participants;
CREATE POLICY "everyone_read_participants" ON public.chat_battle_participants FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "users_insert_participants" ON public.chat_battle_participants;
CREATE POLICY "users_insert_participants" ON public.chat_battle_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_battles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_battle_participants;
