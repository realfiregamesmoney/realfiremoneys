const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data: cols, error: err } = await supabase.from('notifications').select('*').limit(1);
    console.log("Error selecting notifications:", err);
}
run();
