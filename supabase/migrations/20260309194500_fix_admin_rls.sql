-- Unificação e Correção de RLS para Admin (Financeiro e Jogadores)
-- Resolve o problema do admin não ver transações de outros usuários

-- 1. Garantir que as funções de verificação de admin usem SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
 AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

-- 2. Corrigir políticas da tabela TRANSACTIONS
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions" ON public.transactions
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can update transactions" ON public.transactions;
CREATE POLICY "Admin manage all transactions" ON public.transactions
FOR ALL TO authenticated
USING (public.is_admin(auth.uid()));

-- 3. Corrigir políticas da tabela PROFILES (para garantir que o enrich funcione no admin)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- 4. Corrigir políticas da tabela FINANCE_TRANSACTIONS (se usada)
DROP POLICY IF EXISTS "Users can view own finance tx" ON public.finance_transactions;
CREATE POLICY "Users can view own finance tx" ON public.finance_transactions
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- 5. Corrigir políticas de NOTIFICAÇÕES (admin deve ver todas para monitorar o sistema se necessário)
DROP POLICY IF EXISTS "Users can see own notifications" ON public.notifications;
CREATE POLICY "Users can see own notifications" ON public.notifications
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- 6. Recarregar o cache do PostgREST
NOTIFY pgrst, 'reload schema';
