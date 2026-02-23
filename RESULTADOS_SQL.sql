-- Atualização de Tabela de Resultados para suportar Pódio e Registro Fiel
ALTER TABLE public.tournament_results ADD COLUMN IF NOT EXISTS place INTEGER DEFAULT 1;

-- Garantir que print_url tem tamanho suficiente
ALTER TABLE public.tournament_results ALTER COLUMN print_url TYPE TEXT;

-- Forçar recarga de cache
NOTIFY pgrst, 'reload schema';
