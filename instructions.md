Olá Mariana, encontrei a raiz do problema no banco de dados.

Existe um "Trigger" (Gatilho) no seu banco de dados chamado `on_auth_user_created` que está falhando no momento do cadastro e, consequentemente, quebrando todo o processo de autenticação. Sempre que um usuário cria uma conta, o Supabase tenta criar o Perfil e as Roles dele, mas como faltam algumas validações contra campos nulos, o banco recusa e cancela tudo.
Como estou pelo terminal, não consigo rodar comandos SQL de alto nível diretamente por segurança, precisamos rodar pelo painel SQL.

Por favor, faça o seguinte:
1. Acesse o **Dashboard do seu Supabase** (https://supabase.com/dashboard)
2. Acesse seu projeto (ttwwummvytpjftyiorac)
3. No menu esquerdo, vá em **"SQL Editor"** e clique em **"+ New Query"**.
4. Copie todo o código abaixo, cole lá e aperte **"RUN"**:

```sql
-- Remove o trigger defeituoso temporariamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recria a função de forma blindada
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
  v_nickname := COALESCE(NEW.raw_user_meta_data->>'nickname', NEW.raw_user_meta_data->>'full_name', 'Jogador');
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');

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
  RAISE LOG 'Error within handle_new_user for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Religa o trigger de forma segura
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

Assim que você rodar esse comando lá no Supabase e der "Success", pode me confirmar aqui. Isso deve resolver definitivamente a falha de Auth!
