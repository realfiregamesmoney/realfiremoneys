
-- 1. CRIAÇÃO DA TABELA DE SESSÕES (PARA MONITORAMENTO EM TEMPO REAL)
CREATE TABLE IF NOT EXISTS public.minigame_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    game_id TEXT NOT NULL, -- 'shooting_game' ou 'jumping_game'
    status TEXT DEFAULT 'active', -- 'active' ou 'finished'
    score NUMERIC DEFAULT 0,
    played_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ATIVAÇÃO DO REALTIME (PARA O PAINEL ADMIN ATUALIZAR SOZINHO)
ALTER PUBLICATION supabase_realtime ADD TABLE public.minigame_sessions;

-- 3. SEGURANÇA (RLS)
ALTER TABLE public.minigame_sessions ENABLE ROW LEVEL SECURITY;

-- O Admin pode ver e fazer tudo
CREATE POLICY "Admins have full access to sessions" 
ON public.minigame_sessions 
FOR ALL 
TO authenticated 
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

-- O Usuário pode inserir sua própria sessão e atualizar ela (finalizar)
CREATE POLICY "Users can manage own sessions" 
ON public.minigame_sessions 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 4. LIMPEZA DO HISTÓRICO ANTIGO DE TRANSAÇÕES (POLUÍDO)
DELETE FROM public.transactions 
WHERE type = 'race_score' 
AND created_at < NOW() - INTERVAL '1 minute';
