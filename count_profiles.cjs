const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function countProfiles() {
    const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: 'exact', head: true });

    if (error) {
        console.log("Error:", error.message);
    } else {
        console.log("Total profiles:", count);
    }
}
countProfiles();
