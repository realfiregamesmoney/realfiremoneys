const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const envUrl = envFile.match(/VITE_SUPABASE_URL="(.+)"/)[1];
const envKey = envFile.match(/VITE_SUPABASE_SERVICE_ROLE_KEY="(.+)"/)[1];

const supabase = createClient(envUrl, envKey);

async function testSql() {
    const sql = `
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

DROP POLICY IF EXISTS "Admins can read security logs" ON public.admin_security_logs;
CREATE POLICY "Admins can read security logs" ON public.admin_security_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert security logs" ON public.admin_security_logs;
CREATE POLICY "Anyone can insert security logs" ON public.admin_security_logs FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.admin_security_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key_name TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.admin_security_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read security settings" ON public.admin_security_settings;
CREATE POLICY "Anyone can read security settings" ON public.admin_security_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can update security settings" ON public.admin_security_settings;
CREATE POLICY "Admins can update security settings" ON public.admin_security_settings FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.admin_security_settings (key_name, is_active)
VALUES 
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
    ('immutable_ledger', true),
    ('auto_rotate', true)
ON CONFLICT (key_name) DO NOTHING;
    `;

    const { data, error } = await supabase.rpc('exec_sql', { query: sql });
    console.log("EXEC_SQL query:", error?.message || "SUCCESS");

    if (error?.message?.includes("Could not find")) {
        const { data: d2, error: e2 } = await supabase.rpc('exec_sql', { sql });
        console.log("EXEC_SQL sql:", e2?.message || "SUCCESS");

        const { data: d3, error: e3 } = await supabase.rpc('execute_sql', { query: sql });
        console.log("EXECUTE_SQL query:", e3?.message || "SUCCESS");
    }
}

testSql();
