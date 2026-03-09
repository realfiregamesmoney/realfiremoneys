const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    const tables = ['achievements', 'user_achievements', 'user_roles', 'profiles'];
    for (const t of tables) {
        const { data, error } = await supabase.from(t).select('*').limit(1);
        console.log(`Table ${t}:`, error ? error.message : "Exists!");
        if (!error && data) {
            console.log(`Data in ${t}:`, data);
        }
    }
}
test();
