-- Adiciona suporte a imagens e áudios no Chat Global
ALTER TABLE public.global_chat_messages
  ADD COLUMN IF NOT EXISTS media_url TEXT,
  ADD COLUMN IF NOT EXISTS media_type TEXT CHECK (media_type IN ('image', 'audio'));

-- Configurações de controle de mídia pelo Admin (desativadas por padrão = habilitadas)
INSERT INTO public.notification_settings (key_name, category, label, is_enabled)
VALUES
  ('global_chat_images_enabled', 'chat', 'Permitir Imagens no Chat', true),
  ('global_chat_audio_enabled', 'chat', 'Permitir Áudios no Chat', true)
ON CONFLICT (key_name) DO NOTHING;

NOTIFY pgrst, 'reload schema';
