-- Create Vault Packages Table
CREATE TABLE IF NOT EXISTS public.vault_packages (
    id TEXT PRIMARY KEY, -- 'single', 'silver', 'gold'
    name TEXT NOT NULL,
    amount INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    color TEXT NOT NULL, -- 'gray', 'blue', 'yellow'
    badge TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.vault_packages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Vault packages are viewable by everyone" ON public.vault_packages FOR SELECT USING (true);
CREATE POLICY "Admins can manage vault packages" ON public.vault_packages FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Insert defaults
INSERT INTO public.vault_packages (id, name, amount, price, color, badge)
VALUES 
    ('single', 'Investida Única', 1, 2.00, 'gray', NULL),
    ('silver', 'Pacote EspecialISTA', 10, 15.00, 'blue', 'Recomendado'),
    ('gold', 'Arsenal de Ouro', 50, 50.00, 'yellow', 'Elite')
ON CONFLICT (id) DO NOTHING;

-- Trigger for updated_at
CREATE TRIGGER set_vault_packages_updated_at
BEFORE UPDATE ON public.vault_packages
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.vault_packages;
