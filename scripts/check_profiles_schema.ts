import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = Object.fromEntries(
    fs.readFileSync('.env', 'utf8')
        .split('\n')
        .filter(line => line.includes('='))
        .map(line => {
            const [k, ...v] = line.split('=');
            let val = v.join('=').trim();
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            return [k.trim(), val];
        })
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
    const { data, error } = await supabase.rpc('execute_sql', {
        sql_query: `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles';
    `
    });

    if (error) {
        console.error("Error fetching schema:", error);
        // If execute_sql is not available, we can't do much easily without more info, 
        // but usually it is in these projects because "Lovable" uses it.
    } else {
        console.log("Profiles Table Schema:");
        console.table(data);
    }
}

checkSchema();
