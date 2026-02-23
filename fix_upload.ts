import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supa = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
supa.rpc('exec_sql', { sql: `
CREATE POLICY "Admin can upload results" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'profile_proofs' AND (auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')));
CREATE POLICY "Admin can upload results2" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'profile_proofs');
` }).then(console.log);
