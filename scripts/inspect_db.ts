import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function inspect() {
  console.log("Checking profiles table...");
  const { data: columns, error: colError } = await supabase.rpc('get_column_info', { table_name: 'profiles' });
  if (colError) {
    // Fallback if rpc doesn't exist
    const { data: info, error: infoError } = await supabase.from('profiles').select('*').limit(1);
    console.log("Columns (sample data keys):", info ? Object.keys(info[0] || {}) : "No data");
    if (infoError) console.error("Error selecting from profiles:", infoError);
  } else {
    console.log("Columns:", columns);
  }

  console.log("\nChecking trigger function...");
  const { data: func, error: funcError } = await supabase.rpc('get_function_def', { function_name: 'handle_new_user' });
  if (funcError) {
      // Try raw SQL if RPC fails
      const { data: rawFunc, error: rawError } = await supabase.rpc('execute_sql', {
          sql_query: "SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'handle_new_user';"
      });
      console.log("Function definition:", rawFunc || rawError);
  } else {
      console.log("Function definition:", func);
  }
}

inspect();
