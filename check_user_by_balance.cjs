const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function checkProfile() {
    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("saldo", 998);

    if (error) {
        console.log("Error:", error.message);
    } else {
        console.log("Profile:", data);
    }
}
checkProfile();
