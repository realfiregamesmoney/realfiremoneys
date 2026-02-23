import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
    const formData = {
        title: "Test",
        scheduled_at: new Date().toISOString(),
        ticket_price: 10,
        prize_type: "cash",
        prize_product_name: "",
        prize_product_image: "",
        prize_product_value: 0,
        platform_fee_percent: 30, // Default 30%
        questions: Array(6).fill(0).map((_, i) => ({
            id: i,
            text: i === 5 ? "PERGUNTA MATA-MATA (DESEMPATE)" : `Pergunta ${i + 1}`,
            options: ["A", "B", "C", "D"],
            correctIndex: 0
        }))
    };

    const { data, error } = await supabase.from('quiz_events').insert(formData).select();
    if (error) {
        console.error("ERROR INSERTING:", JSON.stringify(error, null, 2));
    } else {
        console.log("SUCCESS:", JSON.stringify(data, null, 2));
    }
}
run();
