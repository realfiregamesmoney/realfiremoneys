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

async function main() {
    // Use postgrest directly to get column info if we can, 
    // but supabase-js doesn't expose it easily without execute_sql.
    // We can try to get it by selecting from information_schema via a trick or just by checking what fields are available in a record.
    // Since the table is empty, we can try to "upsert" an empty object and see the error.

    const { error } = await supabase.from('profiles').insert([{}]);
    // The error message usually contains the column names in "details" if it's a constraint violation.
    console.log("Error details:", error?.details);
}

main();
