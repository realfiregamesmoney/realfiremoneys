-- Sincronização de Schema para suportar Prêmios Dinâmicos e Customização Visual
-- Resolve os erros microscópicos identificados na auditoria (AdminTournaments.tsx)

ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS prize_first INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS prize_second INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS prize_third INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS prize_distribution TEXT DEFAULT 'winner',
ADD COLUMN IF NOT EXISTS button_color TEXT DEFAULT 'orange',
ADD COLUMN IF NOT EXISTS max_level INTEGER,
ADD COLUMN IF NOT EXISTS extra_text TEXT,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS platform_tax NUMERIC DEFAULT 0;

-- Notificação para o PostgREST recarregar o cache do schema imediatamente
NOTIFY pgrst, 'reload schema';
