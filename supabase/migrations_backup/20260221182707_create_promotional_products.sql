CREATE TABLE public.promotional_products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  url text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.promotional_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active promotional_products" ON public.promotional_products
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage promotional_products" ON public.promotional_products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

INSERT INTO public.promotional_products (title, url, is_active) 
VALUES ('QUERO ME TORNAR UM MESTRE NO FREE FIRE E GANHAR AINDA MAIS', '#', true);

NOTIFY pgrst, 'reload schema';
