-- ==============================================================
-- 🚨 CORREÇÃO URGENTE DO BANCO DE DADOS - REAL FIRE MONEYS 🚨
-- ==============================================================
-- Por favor, copie e cole TODO ESTE ARQUIVO no SQL Editor do Supabase 
-- e clique em "RUN".

-- 1. CRIAÇÃO DAS TABELAS DE CHAT GLOBAL QUE ESTAVAM FALTANDO
CREATE TABLE IF NOT EXISTS public.global_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.global_chat_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.global_chat_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
);

-- ==============================================
-- 2. HABILITAR SEGURANÇA E CRIAR POLÍTICAS DO CHAT
ALTER TABLE public.global_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_chat_reactions ENABLE ROW LEVEL SECURITY;

-- Limpa as políticas existentes (evitar duplicações em re-runs)
DROP POLICY IF EXISTS "everyone_can_read_chat" ON public.global_chat_messages;
DROP POLICY IF EXISTS "users_can_insert_chat" ON public.global_chat_messages;
DROP POLICY IF EXISTS "admin_all_chat" ON public.global_chat_messages;
DROP POLICY IF EXISTS "everyone_can_read_reactions" ON public.global_chat_reactions;
DROP POLICY IF EXISTS "users_can_insert_reactions" ON public.global_chat_reactions;
DROP POLICY IF EXISTS "users_can_delete_reactions" ON public.global_chat_reactions;

-- Regras: Leitura permitida para todos logados
CREATE POLICY "everyone_can_read_chat" ON public.global_chat_messages FOR SELECT TO authenticated USING (true);
-- Regras: Inserção para jogadores comuns
CREATE POLICY "users_can_insert_chat" ON public.global_chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
-- Regras: Admins podem fazer TUDO (Insert, Update, Delete) no chat (Essencial para limpar histórico!)
CREATE POLICY "admin_all_chat" ON public.global_chat_messages FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);

CREATE POLICY "everyone_can_read_reactions" ON public.global_chat_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_can_insert_reactions" ON public.global_chat_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_can_delete_reactions" ON public.global_chat_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ==============================================
-- 3. AJUSTE DE PERMISSÃO NO BUCKET DE IMAGENS (profile_proofs)
-- Para que o Administrador consiga salvar imagens de resultados sem erros de permissão RLS
DROP POLICY IF EXISTS "Admin_Upload_Profile_Proofs" ON storage.objects;

CREATE POLICY "Admin_Upload_Profile_Proofs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'profile_proofs' 
    AND 
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);

-- Isso garante que as notificações de banco de dados cheguem no Realtime do app para o Admin
ALTER PUBLICATION supabase_realtime ADD TABLE public.global_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.global_chat_reactions;
