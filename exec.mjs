import { createClient } from './node_modules/@supabase/supabase-js/dist/index.mjs';
import dotenv from 'dotenv';
dotenv.config({path: './.env'});
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);
const run = async () => {
    // A function we can use to execute raw sql
    const { data, error } = await supabase.rpc('exec_sql', { sql: "ALTER TABLE vault_packages ADD COLUMN IF NOT EXISTS button_text text DEFAULT 'ADQUIRIR';" }); 
    console.log("Connected", error);
};
run();
