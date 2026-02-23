-- Drop the trigger temporarily
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the handler function with MORE logging and LESS assumptions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nickname text;
  v_full_name text;
BEGIN
  -- 1. Extract and sanitize metadata to avoid null constraint errors
  v_nickname := COALESCE(NEW.raw_user_meta_data->>'nickname', NEW.raw_user_meta_data->>'full_name', 'Jogador');
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');

  -- 2. Insert into profiles (handle potential unique constraints manually if needed, though id is PK)
  INSERT INTO public.profiles (user_id, email, nickname, full_name, saldo, nivel, tournaments_played, total_winnings, victories)
  VALUES (
    NEW.id,
    NEW.email,
    v_nickname,
    v_full_name,
    0.00,
    1,
    0,
    0.00,
    0
  );

  -- 3. Assign Roles
  IF NEW.email = 'realfiregamemoney@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Extremely important: if we fail here, we MUST NOT return NULL or raise an error 
  -- that blocks the auth.users insertion, otherwise the user can't sign up.
  RAISE LOG 'Error within handle_new_user trigger for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Re-attach the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
