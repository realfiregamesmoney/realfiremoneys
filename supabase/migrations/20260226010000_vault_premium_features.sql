
-- Update Vault System for Products and Premium Hints
ALTER TABLE public.vault_events 
ADD COLUMN IF NOT EXISTS prize_type text DEFAULT 'cash', -- 'cash' or 'product'
ADD COLUMN IF NOT EXISTS prize_product_name text,
ADD COLUMN IF NOT EXISTS prize_product_image text,
ADD COLUMN IF NOT EXISTS show_estimated_value boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS estimated_prize_value numeric DEFAULT 0;

ALTER TABLE public.vault_hints
ADD COLUMN IF NOT EXISTS unlock_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false;

-- Table to track early hint unlocks
CREATE TABLE IF NOT EXISTS public.vault_unlocked_hints (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    hint_id uuid REFERENCES public.vault_hints(id) ON DELETE CASCADE,
    unlocked_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, hint_id)
);

-- RLS for unlocked hints
ALTER TABLE public.vault_unlocked_hints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own unlocked hints" 
ON public.vault_unlocked_hints FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can unlock hints via paid system" 
ON public.vault_unlocked_hints FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all unlocked hints" 
ON public.vault_unlocked_hints FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Update vault_hints SELECT policy to allow viewing if user has unlocked it
DROP POLICY IF EXISTS "Revealed hints are viewable by everyone" ON public.vault_hints;
CREATE POLICY "Hints are viewable if revealed or unlocked" ON public.vault_hints FOR SELECT USING (
    is_revealed = true 
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR EXISTS (SELECT 1 FROM public.vault_unlocked_hints WHERE user_id = auth.uid() AND hint_id = public.vault_hints.id)
);

-- Enable Realtime for unlocked hints
ALTER PUBLICATION supabase_realtime ADD TABLE public.vault_unlocked_hints;
