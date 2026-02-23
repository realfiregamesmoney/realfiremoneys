import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

const signUp = async () => {
  const email = `test_user_${Date.now()}@realfire.com`;
  console.log('Registering email: ', email);
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: 'Password123!',
    email_confirm: true,
    user_metadata: { full_name: 'Test Setup User' }
  });
  console.log(data, error);
}
signUp();
