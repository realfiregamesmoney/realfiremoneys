
-- 1. Recreate trigger for auto-creating profiles on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Add stats columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS total_winnings numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tournaments_played integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS victories integer NOT NULL DEFAULT 0;

-- 3. Create support messages table for chat
CREATE TABLE public.support_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  message text NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View messages of own tickets or admin"
  ON public.support_messages FOR SELECT
  USING (
    is_admin(auth.uid()) OR
    EXISTS (SELECT 1 FROM support_tickets WHERE id = ticket_id AND user_id = auth.uid())
  );

CREATE POLICY "Send messages to own tickets or admin"
  ON public.support_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND (
      is_admin(auth.uid()) OR
      EXISTS (SELECT 1 FROM support_tickets WHERE id = ticket_id AND user_id = auth.uid())
    )
  );

-- 4. Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.enrollments;

-- 5. Recreate updated_at trigger on profiles
CREATE OR REPLACE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Recreate balance check trigger
CREATE OR REPLACE TRIGGER prevent_negative_balance
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_balance_not_negative();
