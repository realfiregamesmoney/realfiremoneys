-- Adicionar colunas de tema ao Mega Quiz
ALTER TABLE public.quiz_events 
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#EAB308',
ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#000000',
ADD COLUMN IF NOT EXISTS symbol_icon TEXT DEFAULT 'Zap',
ADD COLUMN IF NOT EXISTS banner_url TEXT,
ADD COLUMN IF NOT EXISTS estimated_prize_value DECIMAL(10,2) DEFAULT 0.00;

-- Recarregar cache do PostgREST
NOTIFY pgrst, 'reload schema';
