import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(20)
  if (error) {
    console.error("Error fetching logs:", error)
  } else {
    console.log("Found", data.length, "logs.")
    if (data.length > 0) {
      data.forEach(log => console.log(`[${log.created_at}] ${log.action_type}: ${log.details}`))
    }
  }
}
test()
