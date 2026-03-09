const fs = require('fs');
const envFile = fs.readFileSync('.env', 'utf8');
const envUrl = envFile.match(/VITE_SUPABASE_URL="(.+)"/)[1];
const envKey = envFile.match(/VITE_SUPABASE_SERVICE_ROLE_KEY="(.+)"/)[1];
console.log(envUrl.substring(0, 15) + "...");
console.log(envKey.substring(0, 15) + "...");
