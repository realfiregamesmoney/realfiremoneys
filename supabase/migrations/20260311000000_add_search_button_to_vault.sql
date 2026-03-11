-- Adiciona colunas para o botão de busca de senha no cofre
ALTER TABLE public.vault_events 
ADD COLUMN IF NOT EXISTS search_button_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS search_button_text TEXT DEFAULT 'PROCURAR SENHA',
ADD COLUMN IF NOT EXISTS search_button_url TEXT,
ADD COLUMN IF NOT EXISTS search_button_price NUMERIC DEFAULT 0;

-- Recarrega o cache
NOTIFY pgrst, 'reload schema';
