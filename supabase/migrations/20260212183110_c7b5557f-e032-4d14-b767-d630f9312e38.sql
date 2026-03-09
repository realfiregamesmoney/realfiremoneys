
-- Fix tournaments RLS: Change policies to PERMISSIVE so admin can manage
DROP POLICY IF EXISTS "Admins can manage tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Anyone can view tournaments" ON public.tournaments;

CREATE POLICY "Anyone can view tournaments"
ON public.tournaments FOR SELECT
USING (true);

CREATE POLICY "Admins can insert tournaments"
ON public.tournaments FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update tournaments"
ON public.tournaments FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete tournaments"
ON public.tournaments FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Also create a payment_links table for the admin payment link management feature
CREATE TABLE IF NOT EXISTS public.payment_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active payment link"
ON public.payment_links FOR SELECT
USING (true);

CREATE POLICY "Admins can insert payment links"
ON public.payment_links FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update payment links"
ON public.payment_links FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete payment links"
ON public.payment_links FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
