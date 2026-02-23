-- =================================================================
-- 🚨 CORREÇÃO DEFINITIVA DO UPLOAD DE IMAGENS (PRINTS) 🚨
-- =================================================================

-- 1. Garante que o Bucket 'profile_proofs' exista e seja público
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile_proofs', 'profile_proofs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Limpeza de Políticas de Segurança (Remove limitações antigas)
DROP POLICY IF EXISTS "Give users access to own folder 1q2w3e_0" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1q2w3e_1" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1q2w3e_2" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1q2w3e_3" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete Access" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update Access" ON storage.objects;

-- 3. CRIAR POLÍTICAS INFALÍVEIS (TOTALMENTE ABERTAS PARA O SISTEMA)

-- Permitir Visualizar: Qualquer um pode ver imagens
CREATE POLICY "Public Read Access" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'profile_proofs');

-- Permitir Fazer Upload (Insert): Qualquer usuário logado pode upar (Garante que o Admin logado consiga)
CREATE POLICY "Auth Insert Access" 
    ON storage.objects FOR INSERT 
    TO authenticated 
    WITH CHECK (bucket_id = 'profile_proofs');

-- Permitir Atualizar a imagem que subiu (Update):
CREATE POLICY "Auth Update Access" 
    ON storage.objects FOR UPDATE 
    TO authenticated 
    USING (bucket_id = 'profile_proofs');

-- Permitir Apagar (Delete):
CREATE POLICY "Auth Delete Access" 
    ON storage.objects FOR DELETE 
    TO authenticated 
    USING (bucket_id = 'profile_proofs');

NOTIFY pgrst, 'reload schema';
