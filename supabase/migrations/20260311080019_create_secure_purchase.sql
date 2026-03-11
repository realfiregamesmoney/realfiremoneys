-- Função segura para compra de patentes e honrarias
CREATE OR REPLACE FUNCTION public.purchase_achievement(
  p_user_id UUID,
  p_achievement_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_achievement RECORD;
  v_profile RECORD;
  v_existing_ua RECORD;
  v_new_saldo DECIMAL;
BEGIN
  -- 1. Buscar a conquista (patente/honraria)
  SELECT * INTO v_achievement
  FROM public.achievements
  WHERE id = p_achievement_id
  FOR UPDATE; -- Bloqueia a linha para evitar concorrência

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conquista não encontrada.';
  END IF;

  IF NOT v_achievement.is_buyable THEN
    RAISE EXCEPTION 'Esta conquista não está disponível para compra.';
  END IF;

  -- 2. Buscar o perfil do usuário
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE user_id = p_user_id
  FOR UPDATE; -- Bloqueia a linha de saldo para evitar gastos duplicados (race conditions)

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil do usuário não encontrado.';
  END IF;

  -- 3. Verificar saldo
  IF COALESCE(v_profile.saldo, 0) < v_achievement.price THEN
    RAISE EXCEPTION 'Saldo insuficiente.';
  END IF;

  -- 4. Calcular novo saldo
  v_new_saldo := COALESCE(v_profile.saldo, 0) - v_achievement.price;

  -- 5. Deduzir o saldo
  UPDATE public.profiles
  SET saldo = v_new_saldo,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- 6. Verificar se o usuário já possui a conquista
  SELECT * INTO v_existing_ua
  FROM public.user_achievements
  WHERE user_id = p_user_id AND achievement_id = p_achievement_id;

  -- 7. Adicionar ou atualizar a conquista do usuário
  IF FOUND THEN
    UPDATE public.user_achievements
    SET count = COALESCE(count, 0) + 1,
        earned_at = NOW()
    WHERE id = v_existing_ua.id;
  ELSE
    INSERT INTO public.user_achievements (
      user_id, 
      achievement_id, 
      count, 
      is_active
    ) VALUES (
      p_user_id, 
      p_achievement_id, 
      1, 
      false
    );
  END IF;

  -- 8. Registrar a transação no histórico
  INSERT INTO public.transactions (
    user_id,
    type,
    amount,
    status
  ) VALUES (
    p_user_id,
    'patent_purchase',
    v_achievement.price,
    'approved'
  );

  -- Retornar sucesso em formato JSON
  RETURN jsonb_build_object(
    'success', true,
    'new_saldo', v_new_saldo,
    'message', 'Patente adquirida com sucesso!'
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Em caso de qualquer erro, a transação é desfeita automaticamente pelo Postgres (Rollback)
    -- Lança o erro para que o frontend (Supabase Client) possa recebê-lo
    RAISE EXCEPTION '%', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir que os usuários autenticados possam rodar essa função
GRANT EXECUTE ON FUNCTION public.purchase_achievement(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_achievement(UUID, UUID) TO service_role;
