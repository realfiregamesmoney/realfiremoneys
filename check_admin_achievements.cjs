const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function checkAchievements() {
    const { data, error } = await supabase
        .from("user_achievements")
        .select("*, achievements(*)")
        .eq("user_id", '3dd8c8c1-7c72-4a98-860c-5c0bd6f59188');

    if (error) {
        console.log("Error:", error.message);
    } else {
        console.log("Achievements:", data);
    }
}
checkAchievements();
