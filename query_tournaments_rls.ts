import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!);
const anonClient = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_PUBLISHABLE_KEY!);

const run = async () => {
  const { data, error } = await supabase.from('tournaments').select('*');
  console.log('As service_role:', data?.length, error);

  if (data) {
    console.log('Sample tournament:', data[0]);
  }

  const res = await anonClient.auth.signInWithPassword({
    email: 'realfiregamemoney@gmail.com',
    password: 'AdminPassword123!'
  });
  if (res.error) console.log("Login error:", res.error);
  else {
    const { data: d2, error: e2 } = await anonClient.from('tournaments').select('*');
    console.log('As authenticated user:', d2?.length, e2);
  }
}
run();
