CREATE TABLE public.global_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.global_chat_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.global_chat_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE public.global_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_chat_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "everyone_can_read_chat" ON public.global_chat_messages FOR SELECT USING (true);
CREATE POLICY "users_can_insert_chat" ON public.global_chat_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "admin_all_chat" ON public.global_chat_messages FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "everyone_can_read_reactions" ON public.global_chat_reactions FOR SELECT USING (true);
CREATE POLICY "users_can_insert_reactions" ON public.global_chat_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_can_delete_reactions" ON public.global_chat_reactions FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.profiles ADD COLUMN is_chat_banned BOOLEAN DEFAULT FALSE;
