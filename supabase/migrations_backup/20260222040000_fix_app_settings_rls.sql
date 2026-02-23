-- Drop the existing policy that relies on user_roles
DROP POLICY IF EXISTS "Admins can write app_settings" ON public.app_settings;

-- Recreate it using the is_admin() function which checks the profiles table
CREATE POLICY "Admins can write app_settings"
    ON public.app_settings
    FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));
