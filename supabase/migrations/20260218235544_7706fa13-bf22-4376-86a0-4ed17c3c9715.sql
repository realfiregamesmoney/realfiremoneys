
-- Add asaas_payment_id column to transactions table for tracking automatic payments
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS asaas_payment_id text DEFAULT NULL;

-- Add action_source column to distinguish manual vs automatic transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

-- Create index for fast filtering of automatic transactions
CREATE INDEX IF NOT EXISTS idx_transactions_source ON public.transactions(source);
CREATE INDEX IF NOT EXISTS idx_transactions_asaas_payment_id ON public.transactions(asaas_payment_id);
