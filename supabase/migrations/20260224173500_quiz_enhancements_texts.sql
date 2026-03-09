-- Adicionar colunas de textos customizáveis ao Mega Quiz
ALTER TABLE public.quiz_events 
ADD COLUMN IF NOT EXISTS welcome_text TEXT DEFAULT 'Participe do Mega Quiz e ganhe prêmios!',
ADD COLUMN IF NOT EXISTS rules_text TEXT DEFAULT 'O jogo consiste em 5 perguntas oficiais e 1 desempate. Se errar, você pode reviver pagando com seu saldo do app.',
ADD COLUMN IF NOT EXISTS extra_rules_text TEXT DEFAULT 'A cada rodada o tempo diminui e a pressão aumenta!',
ADD COLUMN IF NOT EXISTS button_text TEXT DEFAULT 'Reservar Meu Ticket';

-- Tabela de alertas globais
CREATE TABLE IF NOT EXISTS public.broadcast_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para alertas
ALTER TABLE public.broadcast_messages ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read broadcast messages') THEN
        CREATE POLICY "Anyone can read broadcast messages" ON public.broadcast_messages FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Only admins can insert broadcast messages') THEN
        CREATE POLICY "Only admins can insert broadcast messages" ON public.broadcast_messages FOR INSERT WITH CHECK (
            EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
        );
    END IF;
END $$;

-- Recarregar cache
NOTIFY pgrst, 'reload schema';
