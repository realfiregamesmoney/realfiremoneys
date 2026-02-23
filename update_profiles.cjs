const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://jieokmcyxftfjpfuvimj.supabase.co',
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''
);

async function alterTable() {
  const { error } = await supabase.rpc('execute_sql', {
    sql_query: `
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'Free Avulso';
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS passes_available INTEGER DEFAULT 0;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pass_value NUMERIC DEFAULT 0;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_expiration TIMESTAMP WITH TIME ZONE;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;
    `
  });
  console.log("Alter result:", error);
}
alterTable();
