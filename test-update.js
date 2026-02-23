import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  const { data, error } = await supabase.from('transactions').select('*').limit(1)
  console.log("Tx:", data[0]?.id)
  
  if (data[0]) {
      const res = await supabase.from('transactions').update({status: 'approved'}).eq('id', data[0].id)
      console.log("Update res:", res)
  }
}
test()
