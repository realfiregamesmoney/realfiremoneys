ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone default timezone('utc'::text, now());
