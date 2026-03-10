
-- Garantir que a configuração de data de reinicialização existe para Corridas
INSERT INTO public.app_settings (key, value)
VALUES ('race_ranking_last_reset', '2000-01-01T00:00:00.000Z')
ON CONFLICT (key) DO NOTHING;

-- Garantir que a configuração de data de reinicialização existe para Batalhas (futuro)
INSERT INTO public.app_settings (key, value)
VALUES ('battle_ranking_last_reset', '2000-01-01T00:00:00.000Z')
ON CONFLICT (key) DO NOTHING;

-- Atualizar a função de Ranking Global para considerar APENAS pontos após a reinicialização
CREATE OR REPLACE FUNCTION get_global_ranking(p_type TEXT)
RETURNS TABLE (
    user_id UUID,
    score NUMERIC,
    nickname TEXT,
    avatar_url TEXT
) AS $$
DECLARE
    v_reset_date TIMESTAMPTZ;
BEGIN
    -- Busca a data do último reset para o tipo solicitado
    IF p_type = 'race_score' THEN
        SELECT (value->>0)::TIMESTAMPTZ INTO v_reset_date FROM public.app_settings WHERE key = 'race_ranking_last_reset';
    ELSIF p_type = 'battle_score' THEN
        SELECT (value->>0)::TIMESTAMPTZ INTO v_reset_date FROM public.app_settings WHERE key = 'battle_ranking_last_reset';
    ELSE
        v_reset_date := '2000-01-01'::TIMESTAMPTZ;
    END IF;

    -- Se não encontrar a chave, usa uma data antiga
    IF v_reset_date IS NULL THEN
        v_reset_date := '2000-01-01'::TIMESTAMPTZ;
    END IF;

    RETURN QUERY
    SELECT 
        t.user_id, 
        MAX(t.amount) as score,
        p.nickname,
        p.avatar_url
    FROM public.transactions t
    JOIN public.profiles p ON t.user_id = p.user_id
    WHERE t.type = p_type
      AND t.created_at > v_reset_date -- FILTRO CRÍTICO: Pontos "zerados" antes da data
    GROUP BY t.user_id, p.nickname, p.avatar_url
    ORDER BY score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
