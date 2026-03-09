-- Create table to store the state of security switches
CREATE TABLE IF NOT EXISTS public.admin_security_settings (
    key_name TEXT PRIMARY KEY,
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.admin_security_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage security settings" ON public.admin_security_settings
    FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true));

-- Anyone can read to apply the strict rules
CREATE POLICY "Anyone can read security settings" ON public.admin_security_settings
    FOR SELECT USING (true);

-- Insert default rows
INSERT INTO public.admin_security_settings (key_name, is_active) VALUES
('bio_login', true),
('bio_withdraw', true),
('face_withdraw', true),
('jwt_strict', true),
('anti_guile', true),
('anti_kingrow', true),
('device_fp', true),
('geo_fencing', true),
('anti_dump', true),
('encrypt_tx', true),
('rate_limiter', true),
('immutable_ledger', true)
ON CONFLICT (key_name) DO NOTHING;
