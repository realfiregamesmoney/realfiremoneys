-- We need to see if update_modified_column exists
DROP TRIGGER IF EXISTS update_app_settings_modtime ON app_settings;
DROP TRIGGER IF EXISTS handle_updated_at ON app_settings;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- If updated_at is missing, add it
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone default timezone('utc'::text, now());

-- It could be another trigger? Let's drop ALL triggers on app_settings
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'app_settings') LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || r.trigger_name || ' ON app_settings CASCADE;';
    END LOOP;
END
$$;
