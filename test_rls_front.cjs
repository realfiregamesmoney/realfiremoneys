const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function check() {
    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({ email: 'mariana@example.com', password: 'password123' }); // need valid auth, or just try anon
    console.log("Auth:", user ? user.id : 'anon', authError);

    const { data, error } = await supabase.from('app_settings').upsert({ key: `races_test_front`, value: '{"races": 1}' });
    console.log("Upsert check front:", error ? error.message : "Success");
}

check();
