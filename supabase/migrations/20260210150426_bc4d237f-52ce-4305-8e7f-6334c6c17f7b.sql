
-- Add KYC and gamer profile columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS freefire_id text,
  ADD COLUMN IF NOT EXISTS freefire_nick text,
  ADD COLUMN IF NOT EXISTS freefire_level integer,
  ADD COLUMN IF NOT EXISTS freefire_proof_url text;

-- Create storage bucket for profile proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile_proofs', 'profile_proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for profile_proofs bucket
CREATE POLICY "Anyone can view proof images"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile_proofs');

CREATE POLICY "Authenticated users can upload proof images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'profile_proofs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own proof images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'profile_proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own proof images"
ON storage.objects FOR DELETE
USING (bucket_id = 'profile_proofs' AND auth.uid()::text = (storage.foldername(name))[1]);
