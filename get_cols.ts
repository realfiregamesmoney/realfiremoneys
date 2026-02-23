import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!);
async function run() {
    const { data, error } = await supabase.from('tournaments')
      .insert({ title: 'dummy' })
      .select('*')
      .single();
    if (data) {
      console.log(Object.keys(data));
      await supabase.from('tournaments').delete().eq('id', data.id);
    } else {
      console.log(error);
    }
}
run();
