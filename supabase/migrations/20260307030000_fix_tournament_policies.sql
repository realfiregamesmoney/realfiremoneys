
-- Add missing policies for tournaments
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'minigame_tournaments' 
        AND policyname = 'Authenticated users can create tournaments'
    ) THEN
        CREATE POLICY "Authenticated users can create tournaments" 
        ON public.minigame_tournaments FOR INSERT 
        WITH CHECK (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'minigame_tournaments' 
        AND policyname = 'Authenticated users can update tournaments'
    ) THEN
        CREATE POLICY "Authenticated users can update tournaments" 
        ON public.minigame_tournaments FOR UPDATE 
        USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Also ensure anyone can view
-- CREATE POLICY "Anyone can view minigame tournaments" ON public.minigame_tournaments FOR SELECT USING (true); -- Already exists

NOTIFY pgrst, 'reload schema';
