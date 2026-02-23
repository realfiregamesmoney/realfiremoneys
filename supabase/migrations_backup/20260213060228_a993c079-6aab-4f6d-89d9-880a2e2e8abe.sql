
-- 1. Garantir que o usuário admin tem a role 'admin' configurada
-- (O trigger handle_new_user já deveria ter feito isso, mas vamos garantir)

-- 2. Criar função para verificar se user é admin (já existe, mas vamos confirmar)
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

-- 3. Atualizar RLS policies para torneios: Garantir que APENAS admins podem criar, editar, deletar
DROP POLICY IF EXISTS "Admins can insert tournaments" ON public.tournaments;
CREATE POLICY "Admins can insert tournaments" 
ON public.tournaments 
FOR INSERT 
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update tournaments" ON public.tournaments;
CREATE POLICY "Admins can update tournaments" 
ON public.tournaments 
FOR UPDATE 
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete tournaments" ON public.tournaments;
CREATE POLICY "Admins can delete tournaments" 
ON public.tournaments 
FOR DELETE 
USING (public.is_admin(auth.uid()));

-- 4. Atualizar RLS policies para profiles: Admins podem editar todos os perfis
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING ((auth.uid() = user_id) OR public.is_admin(auth.uid()))
WITH CHECK ((auth.uid() = user_id) OR public.is_admin(auth.uid()));

-- 5. Atualizar RLS policies para finance_transactions: Admins acesso total
DROP POLICY IF EXISTS "Admins can update finance tx" ON public.finance_transactions;
CREATE POLICY "Admins can update finance tx" 
ON public.finance_transactions 
FOR UPDATE 
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 6. Atualizar RLS policies para payment_links: Garantir acesso restrito a admins
DROP POLICY IF EXISTS "Admins can insert payment links" ON public.payment_links;
CREATE POLICY "Admins can insert payment links" 
ON public.payment_links 
FOR INSERT 
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update payment links" ON public.payment_links;
CREATE POLICY "Admins can update payment links" 
ON public.payment_links 
FOR UPDATE 
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete payment links" ON public.payment_links;
CREATE POLICY "Admins can delete payment links" 
ON public.payment_links 
FOR DELETE 
USING (public.is_admin(auth.uid()));

-- 7. Atualizar audit_logs: Apenas admins podem ler
DROP POLICY IF EXISTS "Admins can read audit logs" ON public.audit_logs;
CREATE POLICY "Admins can read audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (public.is_admin(auth.uid()));

-- 8. Atualizar referrals: Admins acesso total
DROP POLICY IF EXISTS "Admins can update referrals" ON public.referrals;
CREATE POLICY "Admins can update referrals" 
ON public.referrals 
FOR UPDATE 
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 9. Atualizar support_tickets: Admins acesso total
DROP POLICY IF EXISTS "Admins can update tickets" ON public.support_tickets;
CREATE POLICY "Admins can update tickets" 
ON public.support_tickets 
FOR UPDATE 
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 10. Atualizar tournament_participants: Admins acesso total
DROP POLICY IF EXISTS "Admins can update participants" ON public.tournament_participants;
CREATE POLICY "Admins can update participants" 
ON public.tournament_participants 
FOR UPDATE 
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete participants" ON public.tournament_participants;
CREATE POLICY "Admins can delete participants" 
ON public.tournament_participants 
FOR DELETE 
USING (public.is_admin(auth.uid()));

-- 11. Atualizar transactions: Admins acesso total
DROP POLICY IF EXISTS "Admins can update transactions" ON public.transactions;
CREATE POLICY "Admins can update transactions" 
ON public.transactions 
FOR UPDATE 
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));
