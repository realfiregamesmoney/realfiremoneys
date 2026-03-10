
-- REMOVE as políticas antigas que travam a visualização
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Public can view scores" ON public.transactions;

-- CRIA a Nova Política unificada que permite ver os próprios dados, ser Admin OU ver Pontuações de Jogos
CREATE POLICY "Unified transactions access" ON public.transactions
FOR SELECT TO authenticated
USING (
    auth.uid() = user_id 
    OR public.is_admin(auth.uid())
    OR type IN ('race_score', 'battle_score')
);

-- PROFILES: Garantir que o Nome e Avatar sejam públicos para o Ranking aparecer
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
CREATE POLICY "Public profile view" ON public.profiles
FOR SELECT TO authenticated
USING (true);

-- Função RPC Otimizada (Garantir que ela substitua qualquer versão anterior)
CREATE OR REPLACE FUNCTION get_global_ranking(p_type TEXT)
RETURNS TABLE (
    user_id UUID,
    score NUMERIC,
    nickname TEXT,
    avatar_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.user_id, 
        MAX(t.amount) as score,
        p.nickname,
        p.avatar_url
    FROM public.transactions t
    JOIN public.profiles p ON t.user_id = p.user_id
    WHERE t.type = p_type
    GROUP BY t.user_id, p.nickname, p.avatar_url
    ORDER BY score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Forçar o Supabase a reconhecer as mudanças
NOTIFY pgrst, 'reload schema';
