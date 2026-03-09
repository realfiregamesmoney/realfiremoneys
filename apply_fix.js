const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
    await client.connect();
    try {
        await client.query(\`
      CREATE TABLE IF NOT EXISTS public.vault_unlocked_hints (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          vault_id UUID NOT NULL REFERENCES public.vault_events(id) ON DELETE CASCADE,
          hint_id UUID NOT NULL REFERENCES public.vault_hints(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ DEFAULT now(),
          UNIQUE(user_id, hint_id)
      );

      ALTER TABLE public.vault_unlocked_hints ENABLE ROW LEVEL SECURITY;

      DO \$\$ 
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own unlocked hints') THEN
              CREATE POLICY "Users can view their own unlocked hints"
                  ON public.vault_unlocked_hints FOR SELECT
                  USING (auth.uid() = user_id);
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own unlocked hints') THEN
              CREATE POLICY "Users can insert their own unlocked hints"
                  ON public.vault_unlocked_hints FOR INSERT
                  WITH CHECK (auth.uid() = user_id);
          END IF;
      END \$\$;

      NOTIFY pgrst, 'reload schema';
    \`);
    console.log("Migration applied successfully!");
  } catch (err) {
    console.error("Error applying migration:", err);
  } finally {
    await client.end();
  }
}

run();
