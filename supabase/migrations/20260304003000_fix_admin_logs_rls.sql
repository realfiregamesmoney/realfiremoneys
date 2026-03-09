DROP POLICY IF EXISTS "Admins can read security logs" ON public.admin_security_logs;
CREATE POLICY "Admins can read security logs" ON public.admin_security_logs FOR SELECT USING (true);
