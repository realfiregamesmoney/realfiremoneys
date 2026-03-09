const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function tryExecSql() {
    const sql = `
        ALTER TABLE public.user_achievements 
        DROP CONSTRAINT IF EXISTS user_achievements_user_id_fkey;

        ALTER TABLE public.user_achievements
        ADD CONSTRAINT user_achievements_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

        DROP POLICY IF EXISTS "Users can see their achievements" ON public.user_achievements;
        CREATE POLICY "Anyone can see user achievements" ON public.user_achievements FOR SELECT USING (true);
    `;

    // Some people use an RPC named 'exec_sql' or 'run_sql'
    const { data, error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
        console.log("exec_sql failed:", error.message);
    } else {
        console.log("SQL executed successfully!");
    }
}
tryExecSql();
