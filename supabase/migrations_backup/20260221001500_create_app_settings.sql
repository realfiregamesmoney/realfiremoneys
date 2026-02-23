-- =====================================================
-- Migration: create app_settings table
-- Used for global feature flags / configurations
-- =====================================================

CREATE TABLE IF NOT EXISTS public.app_settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger to auto-update updated_at on any change
CREATE OR REPLACE FUNCTION public.handle_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER set_app_settings_updated_at
    BEFORE UPDATE ON public.app_settings
    FOR EACH ROW EXECUTE FUNCTION public.handle_app_settings_updated_at();

-- Row Level Security
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode LER as configurações
CREATE POLICY "Authenticated users can read app_settings"
    ON public.app_settings
    FOR SELECT
    TO authenticated
    USING (true);

-- Somente admins podem INSERIR/ATUALIZAR configurações
CREATE POLICY "Admins can write app_settings"
    ON public.app_settings
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

-- =====================================================
-- Valores Padrão
-- =====================================================

INSERT INTO public.app_settings (key, value)
VALUES
    ('gemini_ai_support', 'false'),
    ('ai_support_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- Adicionar coluna csat_rating ao support_tickets
-- (caso ainda não exista — necessária para a avaliação CSAT)
-- =====================================================

ALTER TABLE public.support_tickets
    ADD COLUMN IF NOT EXISTS csat_rating SMALLINT CHECK (csat_rating BETWEEN 1 AND 5);
