-- Fix missing columns in quiz_events and force schema reload
ALTER TABLE public.quiz_events 
ADD COLUMN IF NOT EXISTS winner_message TEXT DEFAULT 'O jogo deu empate, mas você foi o vencedor. Parabéns pela sobrevivência. Você receberá um troféu dourado grande e brilhante de sobrevivente número 1, e seu prêmio já está na sua conta.',
ADD COLUMN IF NOT EXISTS runner_up_message TEXT DEFAULT 'Deu empate e infelizmente você não foi o mais rápido no tempo das respostas, sinto muito, não foi dessa vez. Mas nós te daremos um troféu prateado de sobrevivente e você também ganhará um passe livre para participar de um torneio.';

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
