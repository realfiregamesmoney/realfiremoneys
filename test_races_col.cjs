const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data, error } = await supabase.from('profiles').select('races_available').limit(1);
    console.log("Profiles check:", data, error);
}

check();
