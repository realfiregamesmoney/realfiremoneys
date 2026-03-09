import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.VITE_SUPABASE_URL?.replace('https', 'postgres').replace('.supabase.co', '.supabase.com')
});

const sql = process.argv.slice(2).join(' ');

if (!sql) {
    console.log("\x1b[33m%s\x1b[0m", "Ares DB Bridge: Insira uma query SQL entre aspas.");
    console.log("Exemplo: npm run db -- \"SELECT * FROM profiles LIMIT 5\"");
    process.exit(0);
}

async function run() {
    try {
        const res = await pool.query(sql);
        if (res.rows.length > 0) console.table(res.rows);
        else console.log("Comando executado com sucesso. (0 linhas retornadas)");
    } catch (err) {
        console.error("\x1b[31m%s\x1b[0m", "Erro na execução:");
        console.error(err.message);
    } finally {
        await pool.end();
    }
}

run();
