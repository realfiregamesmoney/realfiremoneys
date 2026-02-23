-- ==============================================================
-- 🚨 CORREÇÃO DEFINITIVA DO BANCO (RLS E COLUNAS AUSENTES) 🚨
-- ==============================================================

-- 1. Garante que TODAS as colunas novas que o painel tenta usar existam na tabela
ALTER TABLE public.tournament_results ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE;
ALTER TABLE public.tournament_results ADD COLUMN IF NOT EXISTS place INTEGER DEFAULT 1;

-- 2. Reforço de Segurança (RLS) para permitir que a Plataforma salve
ALTER TABLE public.tournament_results ENABLE ROW LEVEL SECURITY;

-- Limpa as travas
DROP POLICY IF EXISTS "allow_all_read" ON public.tournament_results;
DROP POLICY IF EXISTS "allow_all_insert" ON public.tournament_results;

-- Permite Leitura Universal e Inserção Livre (apenas para usuários do sistema Autenticados)
CREATE POLICY "allow_all_read" ON public.tournament_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "allow_all_insert" ON public.tournament_results FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "allow_all_update" ON public.tournament_results FOR UPDATE TO authenticated USING (true);
CREATE POLICY "allow_all_delete" ON public.tournament_results FOR DELETE TO authenticated USING (true);

-- 3. Força a reintegração da Nuvem do Supabase IMEDIATAMENTE.
-- Isso arruma o erro "PGRST204" que mascarava a coluna.
NOTIFY pgrst, 'reload schema';
