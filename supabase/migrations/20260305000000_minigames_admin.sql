
-- Minigames configuration table
CREATE TABLE IF NOT EXISTS public.minigame_configs (
    id TEXT PRIMARY KEY, -- 'shooting', 'jumping', 'damas', etc.
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- 'race' or 'battle'
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Ativo',
    entry_fee DECIMAL(10,2) DEFAULT 10.00,
    prize_amount DECIMAL(10,2) DEFAULT 18.00,
    prize_title TEXT DEFAULT 'Prêmio',
    icon_name TEXT, -- lucide icon name
    theme JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Store package configurations
CREATE TABLE IF NOT EXISTS public.minigame_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL, -- 'race' or 'battle'
    name TEXT NOT NULL,
    amount INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    badge TEXT,
    icon_name TEXT,
    theme JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Minigame play sessions history
CREATE TABLE IF NOT EXISTS public.minigame_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    game_id TEXT REFERENCES public.minigame_configs(id) ON DELETE SET NULL,
    score INTEGER DEFAULT 0,
    prize_won DECIMAL(10,2) DEFAULT 0.00,
    status TEXT DEFAULT 'finished', -- 'playing', 'finished', 'abandoned'
    played_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.minigame_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.minigame_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.minigame_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for configs
CREATE POLICY "Anyone can view minigame configs" ON public.minigame_configs FOR SELECT USING (true);
CREATE POLICY "Admins can manage minigame configs" ON public.minigame_configs FOR ALL 
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Policies for packages
CREATE POLICY "Anyone can view minigame packages" ON public.minigame_packages FOR SELECT USING (true);
CREATE POLICY "Admins can manage minigame packages" ON public.minigame_packages FOR ALL 
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Policies for sessions
CREATE POLICY "Users can view own sessions" ON public.minigame_sessions FOR SELECT 
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can manage sessions" ON public.minigame_sessions FOR ALL 
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Seed data for games
INSERT INTO public.minigame_configs (id, title, description, category, type, entry_fee, prize_amount, icon_name) VALUES
('shooting', 'Shooting', 'Ganhe Pontos no Ranking Atirando.', 'race', 'Arcade 2D', 5.00, 100.00, 'Target'),
('jumping', 'Jumping', 'Ganhe Pontos no Ranking PULANDO.', 'race', 'Arcade 2D', 5.00, 100.00, 'Flag'),
('damas', 'Damas', 'Clássico estratégico de tabuleiro', 'battle', 'Multiplayer Tabuleiro', 10.00, 18.00, 'Crown'),
('xadrez', 'Xadrez', 'Lute pelo rei no tabuleiro', 'battle', 'Multiplayer Tabuleiro', 10.00, 18.00, 'Crown'),
('domino', 'Dominó', 'Descarte primeiro e vença', 'battle', 'Multiplayer Mesa', 10.00, 18.00, 'Puzzle'),
('batalhanaval', 'Batalha Naval', 'Destrua a frota inimiga', 'battle', 'Multiplayer Estratégia', 10.00, 18.00, 'Ship'),
('uno', 'Uno', 'Cartas, cores e reviravoltas', 'battle', 'Multiplayer Cartas', 10.00, 18.00, 'Puzzle'),
('cacheta', 'Cacheta', 'Cartas e muita inteligência', 'battle', 'Multiplayer Cartas', 10.00, 18.00, 'Puzzle')
ON CONFLICT (id) DO NOTHING;

-- Seed data for packages
INSERT INTO public.minigame_packages (category, name, amount, price, icon_name) VALUES
('race', 'Corrida Única', 1, 5.00, 'Rocket'),
('race', 'Piloto Frequente', 5, 20.00, 'Target'),
('race', 'Passaporte Elite', 15, 50.00, 'Zap'),
('battle', 'Batalha Única', 1, 5.00, 'Swords'),
('battle', 'Veterano de Guerra', 5, 20.00, 'Trophy'),
('battle', 'Comandante Elite', 15, 50.00, 'Zap')
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
