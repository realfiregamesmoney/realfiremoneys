
-- Allow all authenticated users to query admin roles (needed for notifications)
CREATE POLICY "Authenticated users can view admin roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
