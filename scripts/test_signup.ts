import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!);

const testSignup = async () => {
  const email = `test_admin_${Date.now()}@gmail.com`;
  console.log(`[Admin] Attempting signup for ${email}...`);
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: 'StrongPassword123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'Test Setup User'
      }
    });
    
    if (error) {
      console.error('Signup failed:', error);
    } else {
      console.log('Signup successful!', { user: data.user?.id });
    }
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}
testSignup();
