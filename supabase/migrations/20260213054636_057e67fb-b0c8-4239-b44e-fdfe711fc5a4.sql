
-- =====================================================
-- FIX 1: Change all RESTRICTIVE policies to PERMISSIVE
-- The issue is that RESTRICTIVE policies ALL must pass,
-- but PERMISSIVE policies only need ONE to pass.
-- =====================================================

-- TOURNAMENTS: Drop and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Anyone can view tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Admins can insert tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Admins can update tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Admins can delete tournaments" ON public.tournaments;

CREATE POLICY "Anyone can view tournaments" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Admins can insert tournaments" ON public.tournaments FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update tournaments" ON public.tournaments FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete tournaments" ON public.tournaments FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- PROFILES: Drop and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'));

-- TRANSACTIONS: Drop and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can create own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can update transactions" ON public.transactions;

CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update transactions" ON public.transactions FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- ENROLLMENTS: Drop and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Users can view own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Users can create enrollments" ON public.enrollments;

CREATE POLICY "Users can view own enrollments" ON public.enrollments FOR SELECT USING ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create enrollments" ON public.enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- AUDIT_LOGS: Drop and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Admins can read audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Players can insert own audit logs" ON public.audit_logs;

CREATE POLICY "Admins can read audit logs" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone authenticated can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- FINANCE_TRANSACTIONS: Drop and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Users can view own finance tx" ON public.finance_transactions;
DROP POLICY IF EXISTS "Users can insert own finance tx" ON public.finance_transactions;
DROP POLICY IF EXISTS "Admins can view all finance tx" ON public.finance_transactions;
DROP POLICY IF EXISTS "Admins can update finance tx" ON public.finance_transactions;

CREATE POLICY "Users can view own finance tx" ON public.finance_transactions FOR SELECT USING ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own finance tx" ON public.finance_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update finance tx" ON public.finance_transactions FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- TOURNAMENT_PARTICIPANTS: Drop and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Users can view participants" ON public.tournament_participants;
DROP POLICY IF EXISTS "Users can enroll themselves" ON public.tournament_participants;
DROP POLICY IF EXISTS "Admins can update participants" ON public.tournament_participants;

CREATE POLICY "Users can view participants" ON public.tournament_participants FOR SELECT USING (true);
CREATE POLICY "Users can enroll themselves" ON public.tournament_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update participants" ON public.tournament_participants FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- SUPPORT_TICKETS: Drop and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can create their own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can view all tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can update tickets" ON public.support_tickets;

CREATE POLICY "Users can view their own tickets" ON public.support_tickets FOR SELECT USING ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create their own tickets" ON public.support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update tickets" ON public.support_tickets FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- REFERRALS: Drop and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Users can view own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Admins can view all referrals" ON public.referrals;
DROP POLICY IF EXISTS "Authenticated users can insert referrals" ON public.referrals;
DROP POLICY IF EXISTS "Admins can update referrals" ON public.referrals;

CREATE POLICY "Users can view own referrals" ON public.referrals FOR SELECT USING ((auth.uid() = referrer_id) OR (auth.uid() = referred_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can insert referrals" ON public.referrals FOR INSERT WITH CHECK (auth.uid() = referred_id);
CREATE POLICY "Admins can update referrals" ON public.referrals FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- PAYMENT_LINKS: Drop and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Anyone can read active payment link" ON public.payment_links;
DROP POLICY IF EXISTS "Admins can insert payment links" ON public.payment_links;
DROP POLICY IF EXISTS "Admins can update payment links" ON public.payment_links;
DROP POLICY IF EXISTS "Admins can delete payment links" ON public.payment_links;

CREATE POLICY "Anyone can read active payment link" ON public.payment_links FOR SELECT USING (true);
CREATE POLICY "Admins can insert payment links" ON public.payment_links FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update payment links" ON public.payment_links FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete payment links" ON public.payment_links FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- USER_ROLES: Drop and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- FIX 2: Add database-level check to prevent negative balance
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_balance_not_negative()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.saldo < 0 THEN
    RAISE EXCEPTION 'Saldo não pode ser negativo. Operação bloqueada.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_negative_balance ON public.profiles;
CREATE TRIGGER prevent_negative_balance
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_balance_not_negative();
