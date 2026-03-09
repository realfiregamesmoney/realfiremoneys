import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
    console.log("Attempting to add column via RPC...");
    const { error } = await supabase.rpc('exec_sql', {
        sql_body: "ALTER TABLE vault_hints ADD COLUMN IF NOT EXISTS pre_reveal_title TEXT DEFAULT 'INFORMAÇÃO CRIPTOGRAFADA';"
    });

    if (error) {
        console.log("RPC Error (sql_body):", error.message);
        // Try 'query' or 'sql' as argument name
        const { error: error2 } = await supabase.rpc('exec_sql', {
            query: "ALTER TABLE vault_hints ADD COLUMN IF NOT EXISTS pre_reveal_title TEXT DEFAULT 'INFORMAÇÃO CRIPTOGRAFADA';"
        });
        if (error2) console.log("RPC Error (query):", error2.message);

        const { error: error3 } = await supabase.rpc('exec_sql', {
            sql: "ALTER TABLE vault_hints ADD COLUMN IF NOT EXISTS pre_reveal_title TEXT DEFAULT 'INFORMAÇÃO CRIPTOGRAFADA';"
        });
        if (error3) console.log("RPC Error (sql):", error3.message);
    } else {
        console.log("Column added successfully!");
    }
}
run();
