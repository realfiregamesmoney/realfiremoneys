import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!);

const emails = ['realfiregamesmoney@gmail.com', 'realfiregamemoney@gmail.com'];

async function elevate() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error('Error listing users', error);
    return;
  }
  
  for (const email of emails) {
    const user = users.find(u => u.email === email);
    if (user) {
      console.log(`Found user ${email} with ID ${user.id}`);
      const { data, error: roleError } = await supabase.from('user_roles').upsert({
        user_id: user.id,
        role: 'admin'
      }, { onConflict: 'user_id, role' });
      
      if (roleError) {
         console.error(`Failed to elevate ${email}:`, roleError);
      } else {
         console.log(`Elevated ${email} to admin!`);
      }
    } else {
      console.log(`User ${email} not found in auth.users. Automatically creating the account for you to guarantee access...`);
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: 'AdminPassword123!',
        email_confirm: true,
        user_metadata: { full_name: 'CEO / Admin' }
      });
      
      if (createError) {
          console.error(`Could not create ${email}`, createError);
      } else if (newUser.user) {
          console.log(`Created user ${email} with ID ${newUser.user.id}. Now elevating to admin...`);
          const { error: roleError2 } = await supabase.from('user_roles').upsert({
            user_id: newUser.user.id,
            role: 'admin'
          }, { onConflict: 'user_id, role' });
          if (roleError2) console.error(roleError2)
          else console.log(`Elevated ${email} to admin!`);
      }
    }
  }
}
elevate();
