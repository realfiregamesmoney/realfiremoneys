-- Adiciona coluna para rastrear se a batalha teve prêmios pagos
ALTER TABLE public.chat_battles ADD COLUMN IF NOT EXISTS prizes_paid BOOLEAN DEFAULT false;
