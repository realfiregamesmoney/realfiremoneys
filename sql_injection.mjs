import { createClient } from './node_modules/@supabase/supabase-js/dist/index.mjs';
import dotenv from 'dotenv';
dotenv.config({path: './.env'});
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

const run = async () => {
    // 1. Fixing Quiz Table Scheme
    const rawSql = `
        ALTER TABLE quiz_events ADD COLUMN IF NOT EXISTS show_estimated_value boolean DEFAULT true;
        ALTER TABLE quiz_events ADD COLUMN IF NOT EXISTS custom_info_text text DEFAULT 'AO VIVO NO APP • TODA TERÇA ÀS 21H';
        ALTER TABLE quiz_events ADD COLUMN IF NOT EXISTS custom_info_color text DEFAULT '#EAB308';
        ALTER TABLE quiz_events ADD COLUMN IF NOT EXISTS is_prize_fixed boolean DEFAULT false;
        ALTER TABLE quiz_events ADD COLUMN IF NOT EXISTS winner_message text;
        ALTER TABLE quiz_events ADD COLUMN IF NOT EXISTS runner_up_message text;
        ALTER TABLE quiz_events ADD COLUMN IF NOT EXISTS extra_rules_text text;
    `;
    const { data, error } = await supabase.rpc('exec_sql', { sql: rawSql });
    console.log("Migration Result:", error || "Success");
};
run();
