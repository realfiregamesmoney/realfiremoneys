-- Final enhancements for Mega Quiz Schema
ALTER TABLE public.quiz_events 
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#EAB308',
ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#000000',
ADD COLUMN IF NOT EXISTS symbol_icon TEXT DEFAULT 'Zap',
ADD COLUMN IF NOT EXISTS banner_url TEXT,
ADD COLUMN IF NOT EXISTS estimated_prize_value DECIMAL(10,2) DEFAULT 0.00;

-- Update RLS for quiz_rankings to allow updates by users
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own rankings') THEN
        CREATE POLICY "Users can update their own rankings" ON public.quiz_rankings FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Enable Realtime for broadcast_messages
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcast_messages;

-- Function to safely update balance (deduct)
CREATE OR REPLACE FUNCTION public.deduct_balance(amount_to_deduct DECIMAL)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET saldo = saldo - amount_to_deduct
  WHERE user_id = auth.uid() AND saldo >= amount_to_deduct;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Saldo insuficiente ou usuário não encontrado';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure broadcast_messages are readable by everyone (redundant but safe)
GRANT SELECT ON public.broadcast_messages TO anon, authenticated;
GRANT ALL ON public.broadcast_messages TO service_role;

NOTIFY pgrst, 'reload schema';
