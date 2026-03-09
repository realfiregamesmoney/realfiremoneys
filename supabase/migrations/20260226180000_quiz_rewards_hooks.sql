-- Hook achievements into Quiz Finalization
-- This ensures winners get trophies and finalists get medals automatically.

CREATE OR REPLACE FUNCTION public.finalize_quiz_winner(p_quiz_id UUID, p_winner_id UUID)
RETURNS void AS $$
DECLARE
    v_prize_amount DECIMAL(10,2);
    v_prize_type TEXT;
    v_estimated_prize DECIMAL(10,2);
    v_ticket_price DECIMAL(10,2);
    v_total_tickets INTEGER;
    v_fee_percent DECIMAL(5,2);
    v_final_prize DECIMAL(10,2);
    v_runner_up record;
BEGIN
    -- 1. Obter informações do quiz
    SELECT 
        prize_type, estimated_prize_value, ticket_price, platform_fee_percent
    INTO 
        v_prize_type, v_estimated_prize, v_ticket_price, v_fee_percent
    FROM public.quiz_events 
    WHERE id = p_quiz_id;

    -- 2. Calcular e pagar prêmio em dinheiro ao Vencedor
    IF v_prize_type = 'cash' THEN
        SELECT count(*) INTO v_total_tickets FROM public.quiz_tickets WHERE quiz_id = p_quiz_id AND status = 'paid';
        v_final_prize := GREATEST(v_estimated_prize, (v_total_tickets * v_ticket_price) * (1 - (v_fee_percent / 100)));
        
        UPDATE public.profiles SET saldo = saldo + v_final_prize WHERE user_id = p_winner_id;
    END IF;

    -- 3. Consagrar o Vencedor (Vitória + Troféu)
    UPDATE public.profiles SET victories = COALESCE(victories, 0) + 1 WHERE user_id = p_winner_id;
    
    -- AWARD TROPHY (Automatic Evolution)
    PERFORM public.award_achievement(p_winner_id, 'Troféu');

    UPDATE public.quiz_events 
    SET validated_winner_id = p_winner_id, status = 'finished' 
    WHERE id = p_quiz_id;

    -- 4. Recompensar Runners-up: Quem chegou na última pergunta mas não foi o mais rápido
    -- Eles ganham Medalha e Passe Livre
    FOR v_runner_up IN (
        SELECT user_id 
        FROM public.quiz_rankings 
        WHERE quiz_id = p_quiz_id AND total_correct >= 5 AND user_id != p_winner_id
    ) LOOP
        -- Incrementa passe livre
        UPDATE public.profiles SET passes_available = COALESCE(passes_available, 0) + 1 WHERE user_id = v_runner_up.user_id;
        
        -- AWARD MEDAL (Automatic Evolution)
        PERFORM public.award_achievement(v_runner_up.user_id, 'Medalha');
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
