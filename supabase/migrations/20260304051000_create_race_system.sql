ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS races_available INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.race_scores (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL DEFAULT 0,
    nickname TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.race_scores ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view race scores') THEN
        CREATE POLICY "Anyone can view race scores"
            ON public.race_scores FOR SELECT
            USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert or update their own score') THEN
        CREATE POLICY "Users can insert or update their own score"
            ON public.race_scores FOR ALL
            USING (auth.uid() = user_id) 
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
