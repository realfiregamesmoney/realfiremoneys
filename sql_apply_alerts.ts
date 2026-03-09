require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function createTable() {
    const query = `
        CREATE TABLE IF NOT EXISTS public.security_alerts (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            reason TEXT NOT NULL,
            level TEXT NOT NULL CHECK (level IN ('yellow', 'red')),
            status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'kicked', 'banned')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
            resolved_at TIMESTAMP WITH TIME ZONE
        );
        -- Insert a stealth radar init so we know it worked.
        INSERT INTO public.security_alerts (name, reason, level, status) 
        SELECT 'Radar_Alpha', 'Radar Heurístico Master Ativado', 'yellow', 'active'
        WHERE NOT EXISTS (SELECT 1 FROM public.security_alerts WHERE name = 'Radar_Alpha');
    `;
    const { error } = await supabase.rpc('exec_sql', { query: query });
    if(error){
       console.log("No RPC 'exec_sql'. Attempting direct injection...");
       // Supabase REST block DDL usually. But we can create it via supabase studio later, let's at least make the table exist 
    }
}
createTable();
