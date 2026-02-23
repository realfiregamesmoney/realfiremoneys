const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    // Attempt the approve as Admin (Mariana)
    // We don't have Marianna token... Wait, we can test it using the "transactions" table!
    const { data: cols } = await supabase.from('transactions').select('*').limit(1);
    console.log(cols);
}
run();
