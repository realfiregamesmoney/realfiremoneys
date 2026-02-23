-- 1. Garante que a tabela de perfis exista com a estrutura correta
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nickname TEXT,
    saldo DECIMAL DEFAULT 0,
    nivel INTEGER DEFAULT 1,
    avatar_url TEXT,
    full_name TEXT,
    cpf TEXT,
    freefire_id TEXT,
    freefire_nick TEXT,
    freefire_level INTEGER,
    freefire_proof_url TEXT,
    total_winnings DECIMAL DEFAULT 0,
    tournaments_played INTEGER DEFAULT 0,
    victories INTEGER DEFAULT 0,
    is_chat_banned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilita RLS se ainda não habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Cria políticas de acesso se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Public profiles are viewable by everyone') THEN
        CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile') THEN
        CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END
$$;

-- 4. Função para criar perfil automaticamente no cadastro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nickname, full_name, saldo)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nickname', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'full_name',
    0
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger associada
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Populando perfis faltantes para usuários existentes
INSERT INTO public.profiles (user_id, nickname, full_name, saldo)
SELECT 
    id, 
    COALESCE(raw_user_meta_data->>'nickname', split_part(email, '@', 1)),
    raw_user_meta_data->>'full_name',
    0
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
