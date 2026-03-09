const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function testJoin() {
    const { data, error } = await supabase
        .from("profiles")
        .select(`
          nickname, avatar_url, freefire_level, total_winnings,
          user_achievements(is_active, achievements(image_url))
        `)
        .gt("total_winnings", 0)
        .order("total_winnings", { ascending: false })
        .limit(10);

    if (error) {
        console.log("Join error:", error.message);
        console.log("Error details:", error);
    } else {
        console.log("Join success! Data count:", data.length);
        if (data.length > 0) {
            console.log("First player achievements:", data[0].user_achievements);
        }
    }
}
testJoin();
