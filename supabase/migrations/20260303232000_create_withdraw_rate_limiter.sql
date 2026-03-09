CREATE OR REPLACE FUNCTION public.check_withdraw_rate_limit()
RETURNS trigger AS $$
DECLARE
  request_count INTEGER;
BEGIN
  -- CONTAGEM CAIXA PRETA: Conta quantos saques o usuário atirou contra a API no curto prazo de 1 minuto
  SELECT COUNT(*) INTO request_count
  FROM public.transactions
  WHERE user_id = NEW.user_id
    AND type = 'withdraw'
    AND created_at > (NOW() - INTERVAL '1 minute');

  -- Se o cara tentar disparar mais de 2 requisições de saque no banco dentro de 60s, é BOT de Throttling (Spam Ataque).
  IF request_count >= 2 THEN
    RAISE EXCEPTION 'ARES_THROTTLING_BLOCK: Rate Limit de Saque Excedido. Fluxo excessivo detectado.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Deleta o gatilho se já existir (Idempotência)
DROP TRIGGER IF EXISTS trg_withdraw_rate_limit ON public.transactions;

-- Cria o gatilho Cão de Guarda ANTES do insert, protegendo o banco
CREATE TRIGGER trg_withdraw_rate_limit
BEFORE INSERT ON public.transactions
FOR EACH ROW
WHEN (NEW.type = 'withdraw')
EXECUTE FUNCTION public.check_withdraw_rate_limit();
