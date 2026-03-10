
-- Permitir que qualquer um veja as pontuações de corrida e batalha na tabela transactions
DROP POLICY IF EXISTS "Public can view scores" ON public.transactions;
CREATE POLICY "Public can view scores" ON public.transactions 
FOR SELECT USING (type IN ('race_score', 'battle_score'));

-- Permitir que qualquer um veja os perfis básicos (nickname e avatar) para o ranking
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
CREATE POLICY "Public can view profiles" ON public.profiles 
FOR SELECT USING (true);

-- Função para buscar o Ranking Global garantindo apenas a MAIOR pontuação por jogador
-- Isso evita o problema do limite de 20 linhas e garante que todos os jogadores apareçam
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
