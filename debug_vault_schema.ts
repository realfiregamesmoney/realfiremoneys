
import { createClient } from '@supabase/supabase-api';
import { supabase } from './src/integrations/supabase/client';

async function checkSchema() {
    console.log('Checking vault_events columns...');
    const { data: eventsCols, error: err1 } = await supabase.rpc('get_table_columns', { table_name: 'vault_events' });
    if (err1) {
        // If RPC doesn't exist, try a direct query to information_schema if possible
        console.log('RPC failed, checking via query...');
        const { data: queryData, error: err2 } = await supabase.from('vault_events').select('*').limit(1);
        if (err2) console.error('Error selecting from vault_events:', err2);
        else console.log('Columns in vault_events:', Object.keys(queryData[0] || {}));
    } else {
        console.log('Columns in vault_events:', eventsCols);
    }

    console.log('Checking vault_hints columns...');
    const { data: hintsCols, error: err3 } = await supabase.from('vault_hints').select('*').limit(1);
    if (err3) console.error('Error selecting from vault_hints:', err3);
    else console.log('Columns in vault_hints:', Object.keys(hintsCols[0] || {}));
}

checkSchema();
