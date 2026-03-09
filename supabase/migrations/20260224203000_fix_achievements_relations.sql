-- Fix relationships for achievements to allow joins from profiles
ALTER TABLE public.user_achievements 
DROP CONSTRAINT IF EXISTS user_achievements_user_id_fkey;

ALTER TABLE public.user_achievements
ADD CONSTRAINT user_achievements_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Update RLS for user_achievements to allow everyone to see them (needed for badges on nicknames)
DROP POLICY IF EXISTS "Users can see their achievements" ON public.user_achievements;
CREATE POLICY "Anyone can see user achievements" ON public.user_achievements FOR SELECT USING (true);
