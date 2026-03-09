const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const envUrl = envFile.match(/VITE_SUPABASE_URL="(.+)"/)[1];
const envKey = envFile.match(/VITE_SUPABASE_SERVICE_ROLE_KEY="(.+)"/)[1];

const supabase = createClient(envUrl, envKey);

async function checkRows() {
  const { data, error } = await supabase.from('admin_security_settings').select('*');
  console.log("SETTINGS DATA LENGTH:", data && data.length);
  if(error) console.log("SETTINGS ERROR:", error);
}

checkRows();
