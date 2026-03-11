import { createClient } from './node_modules/@supabase/supabase-js/dist/index.mjs';
import dotenv from 'dotenv';
dotenv.config({path: './.env'});
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

const run = async () => {
    // There is no execute RAW sql RPC anymore on the DB. 
    // We will bypass the backend missing columns by manually tweaking the UI first.
    console.log("Not possible over API without SQL EXEC bypass");
}
run()
