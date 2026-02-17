
CREATE TABLE public.tournament_results (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id),
  winner_user_id uuid NOT NULL,
  print_url text,
  prize_amount numeric NOT NULL DEFAULT 0,
  admin_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tournament_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tournament results"
ON public.tournament_results
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view tournament results"
ON public.tournament_results
FOR SELECT
USING (auth.uid() IS NOT NULL);
