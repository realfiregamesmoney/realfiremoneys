const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envFile = fs.readFileSync('.env', 'utf8');
const envUrl = envFile.match(/VITE_SUPABASE_URL="(.+)"/)[1];
const envKey = envFile.match(/VITE_SUPABASE_SERVICE_ROLE_KEY="(.+)"/)[1];
const supabase = createClient(envUrl, envKey);

async function addCol() {
    const sql = `
        ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Anyone can update app_settings keys" ON public.app_settings;
        CREATE POLICY "Anyone can update app_settings keys" ON public.app_settings FOR ALL USING (true) WITH CHECK(true);
    `;
    const { error } = await supabase.rpc('execute_sql', { query: sql });
    console.log("RLS policy for app_settings fallback:", error?.message || 'SUCCESS');
}
addCol();
