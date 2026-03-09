DROP POLICY IF EXISTS "Allow all actions for admins" ON app_settings;
CREATE POLICY "Allow all actions for authenticated users" ON app_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
