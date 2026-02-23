import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_PUBLISHABLE_KEY!);

async function run() {
    const { data, error } = await supabase.from('notification_settings').select('*');
    console.log("Notification Settings DATA:", JSON.stringify(data, null, 2));
    if (error) console.error("ERROR:", error);
}
run();
