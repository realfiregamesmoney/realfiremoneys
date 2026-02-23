import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

const query = `
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user cascade;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, nickname, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nickname', COALESCE(NEW.raw_user_meta_data->>'full_name', 'Jogador')),
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );

  IF NEW.email = 'realfiregamemoney@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
`;

const run = async () => {
    const { data, error } = await supabase.rpc('exec_sql', { sql: query });
    if(error){
        console.error("Error with exec_sql (maybe it doesn't exist?):", error)
        // Let's rely on the Supabase SQL editor instead since the user can paste it.
    } else {
        console.log("Trigger updated");
    }
}
run();
