-- Add payment_method and asaas_payment_id column if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'payment_method') THEN
        ALTER TABLE "public"."transactions" ADD COLUMN "payment_method" text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'asaas_payment_id') THEN
        ALTER TABLE "public"."transactions" ADD COLUMN "asaas_payment_id" text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'source') THEN
        ALTER TABLE "public"."transactions" ADD COLUMN "source" text;
    END IF;
END $$;
-- Notify pgrest schema cache refresh
NOTIFY pgrst, 'reload schema';
