const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function checkWinningPlayers() {
    const { data, error } = await supabase
        .from("profiles")
        .select("nickname, total_winnings")
        .gt("total_winnings", 0)
        .order("total_winnings", { ascending: false });

    if (error) {
        console.log("Error:", error.message);
    } else {
        console.log("Players with winnings:", data);
        if (data.length === 0) {
            console.log("No players have winnings > 0 yet.");
        }
    }
}
checkWinningPlayers();
