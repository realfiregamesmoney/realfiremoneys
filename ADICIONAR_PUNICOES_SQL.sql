-- Adicionar colunas para banimento do app e trancar saldo
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_app_banned BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_balance_locked BOOLEAN DEFAULT false;

-- Notifica o Postgrest para reconstruir o cache
NOTIFY pgrst, 'reload schema';
