-- Policies for Admins to bypass RLS on critical tables allowing dashboard edits

DO $$
BEGIN
    -- 1. Profiles
    DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
    CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE USING (
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin')
    );

    -- 2. Transactions
    DROP POLICY IF EXISTS "Admins can update all transactions" ON public.transactions;
    CREATE POLICY "Admins can update all transactions" ON public.transactions
    FOR UPDATE USING (
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin')
    );

    -- 3. Notifications (in case of insertions/updates by admin)
    DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
    CREATE POLICY "Admins can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin')
    );
    
    -- 4. Referrals
    DROP POLICY IF EXISTS "Admins can update referrals" ON public.referrals;
    CREATE POLICY "Admins can update referrals" ON public.referrals
    FOR UPDATE USING (
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin')
    );
END $$;
