require('dotenv').config();
const { Client } = require('pg');

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
    await client.connect();
    try {
        await client.query(`
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
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'minigame_configs' AND policyname = 'Anyone can view minigame configs') THEN
        CREATE POLICY "Anyone can view minigame configs" ON public.minigame_configs FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'minigame_configs' AND policyname = 'Admins can manage minigame configs') THEN
        CREATE POLICY "Admins can manage minigame configs" ON public.minigame_configs FOR ALL 
        USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
    END IF;
END $$;

-- Policies for packages
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'minigame_packages' AND policyname = 'Anyone can view minigame packages') THEN
        CREATE POLICY "Anyone can view minigame packages" ON public.minigame_packages FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'minigame_packages' AND policyname = 'Admins can manage minigame packages') THEN
        CREATE POLICY "Admins can manage minigame packages" ON public.minigame_packages FOR ALL 
        USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
    END IF;
END $$;

-- Policies for sessions
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'minigame_sessions' AND policyname = 'Users can view own sessions') THEN
        CREATE POLICY "Users can view own sessions" ON public.minigame_sessions FOR SELECT 
        USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'minigame_sessions' AND policyname = 'Admins can manage sessions') THEN
        CREATE POLICY "Admins can manage sessions" ON public.minigame_sessions FOR ALL 
        USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
    END IF;
END $$;

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
ON CONFLICT (id) DO UPDATE SET entry_fee = EXCLUDED.entry_fee, prize_amount = EXCLUDED.prize_amount;

-- Seed data for packages
INSERT INTO public.minigame_packages (category, name, amount, price, icon_name) 
SELECT 'race', 'Corrida Única', 1, 5.00, 'Rocket' WHERE NOT EXISTS (SELECT 1 FROM public.minigame_packages WHERE name = 'Corrida Única');
INSERT INTO public.minigame_packages (category, name, amount, price, icon_name) 
SELECT 'race', 'Piloto Frequente', 5, 20.00, 'Target' WHERE NOT EXISTS (SELECT 1 FROM public.minigame_packages WHERE name = 'Piloto Frequente');
INSERT INTO public.minigame_packages (category, name, amount, price, icon_name) 
SELECT 'race', 'Passaporte Elite', 15, 50.00, 'Zap' WHERE NOT EXISTS (SELECT 1 FROM public.minigame_packages WHERE name = 'Passaporte Elite');
INSERT INTO public.minigame_packages (category, name, amount, price, icon_name) 
SELECT 'battle', 'Batalha Única', 1, 5.00, 'Swords' WHERE NOT EXISTS (SELECT 1 FROM public.minigame_packages WHERE name = 'Batalha Única');
INSERT INTO public.minigame_packages (category, name, amount, price, icon_name) 
SELECT 'battle', 'Veterano de Guerra', 5, 20.00, 'Trophy' WHERE NOT EXISTS (SELECT 1 FROM public.minigame_packages WHERE name = 'Veterano de Guerra');
INSERT INTO public.minigame_packages (category, name, amount, price, icon_name) 
SELECT 'battle', 'Comandante Elite', 15, 50.00, 'Zap' WHERE NOT EXISTS (SELECT 1 FROM public.minigame_packages WHERE name = 'Comandante Elite');

      NOTIFY pgrst, 'reload schema';
    `);
        console.log("Minigames Admin Tables applied successfully!");
    } catch (err) {
        console.error("Error applying migration:", err);
    } finally {
        await client.end();
    }
}

run();
