-- Adicionar campos de mensagens e recompensas de vitória ao Mega Quiz
ALTER TABLE public.quiz_events 
ADD COLUMN IF NOT EXISTS winner_message TEXT DEFAULT 'O jogo deu empate, mas você foi o vencedor. Parabéns pela sobrevivência. Você receberá um troféu dourado grande e brilhante de sobrevivente número 1, e seu prêmio já está na sua conta.',
ADD COLUMN IF NOT EXISTS runner_up_message TEXT DEFAULT 'Deu empate e infelizmente você não foi o mais rápido no tempo das respostas, sinto muito, não foi dessa vez. Mas nós te daremos um troféu prateado de sobrevivente e você também ganhará um passe livre para participar de um torneio.';

-- Criar função para finalizar o quiz e pagar o vencedor
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
BEGIN
    -- 1. Obter informações do quiz
    SELECT 
        prize_type, estimated_prize_value, ticket_price, platform_fee_percent
    INTO 
        v_prize_type, v_estimated_prize, v_ticket_price, v_fee_percent
    FROM public.quiz_events 
    WHERE id = p_quiz_id;

    -- 2. Calcular prêmio se for cash
    IF v_prize_type = 'cash' THEN
        SELECT count(*) INTO v_total_tickets FROM public.quiz_tickets WHERE quiz_id = p_quiz_id AND status = 'paid';
        v_final_prize := GREATEST(v_estimated_prize, (v_total_tickets * v_ticket_price) * (1 - (v_fee_percent / 100)));
        
        -- Pagar o vencedor
        UPDATE public.profiles SET saldo = saldo + v_final_prize WHERE user_id = p_winner_id;
    END IF;

    -- 3. Marcar o vencedor, incrementar vitórias e finalizar o evento
    UPDATE public.profiles SET victories = COALESCE(victories, 0) + 1 WHERE user_id = p_winner_id;
    
    UPDATE public.quiz_events 
    SET validated_winner_id = p_winner_id, status = 'finished' 
    WHERE id = p_quiz_id;

    -- 4. Recompensar Runners-up: Quem chegou na última pergunta (6 acertos) mas não ganhou
    UPDATE public.profiles 
    SET passes_available = COALESCE(passes_available, 0) + 1 
    WHERE user_id IN (
        SELECT user_id 
        FROM public.quiz_rankings 
        WHERE quiz_id = p_quiz_id AND total_correct >= 5 AND user_id != p_winner_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
