const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function listTables() {
    const { data, error } = await supabase.rpc('get_tables'); // Usually doesn't exist
    if (error) {
        // Try another way: query a common table and see if it fails
        console.log("RPC get_tables failed, trying to list files in migrations to guess...");
    } else {
        console.log("Tables:", data);
    }
}

async function checkExistence() {
    // Try to select from information_schema
    const { data, error } = await supabase.from('achievements').select('id').limit(1);
    if (error) {
        console.log("Achievements table error:", error.message);
    } else {
        console.log("Achievements table exists!");
    }
}
checkExistence();
