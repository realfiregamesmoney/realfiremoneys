-- Allow players to insert their own audit logs
CREATE POLICY "Players can insert own audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND admin_id = auth.uid());
