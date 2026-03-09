CREATE TABLE IF NOT EXISTS public.admin_security_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    threat_id TEXT,
    player_name TEXT,
    reason TEXT,
    action_taken TEXT,
    level TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.admin_security_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read security logs" ON public.admin_security_logs
    FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true));

CREATE POLICY "Anyone can insert security logs" ON public.admin_security_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');
