-- Permite que usuários autenticados registrem indicações na tabela referrals
CREATE POLICY "Authenticated users can insert referrals"
ON public.referrals FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);
