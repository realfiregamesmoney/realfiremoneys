const { Client } = require('pg');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
    await client.connect();
    try {
        await client.query(`
        -- Função para COMPRAR PASSES (checa saldo, diminui saldo, adiciona passes, cria transacao)
        CREATE OR REPLACE FUNCTION buy_race_passes(p_user_id UUID, p_amount INTEGER, p_price NUMERIC, p_package_name TEXT)
        RETURNS BOOLEAN
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
            v_current_saldo NUMERIC;
            v_current_passes INTEGER;
        BEGIN
            -- Obtem saldo atual e passes
            SELECT saldo, passes_available INTO v_current_saldo, v_current_passes
            FROM public.profiles
            WHERE user_id = p_user_id
            FOR UPDATE; -- Lock na linha para evitar condicao de corrida

            IF v_current_saldo < p_price THEN
                RAISE EXCEPTION 'Saldo insuficiente';
            END IF;

            -- Atualiza perfil
            UPDATE public.profiles
            SET saldo = saldo - p_price,
                passes_available = COALESCE(passes_available, 0) + p_amount
            WHERE user_id = p_user_id;

            -- Insere transacao
            INSERT INTO public.transactions (user_id, type, amount, status)
            VALUES (p_user_id, 'race_purchase', p_price, 'approved');

            RETURN TRUE;
        END;
        $$;

        -- Função para CONSUMIR 1 PASSE na entrada do jogo
        CREATE OR REPLACE FUNCTION consume_race_pass(p_user_id UUID)
        RETURNS BOOLEAN
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
            v_current_passes INTEGER;
        BEGIN
            SELECT passes_available INTO v_current_passes
            FROM public.profiles
            WHERE user_id = p_user_id
            FOR UPDATE;

            IF v_current_passes IS NULL OR v_current_passes <= 0 THEN
                RETURN FALSE; -- Nao tem passes
            END IF;

            UPDATE public.profiles
            SET passes_available = passes_available - 1
            WHERE user_id = p_user_id;

            RETURN TRUE;
        END;
        $$;

        -- Função para REGISTRAR O RECORDE
        CREATE OR REPLACE FUNCTION update_race_score(p_user_id UUID, p_score INTEGER)
        RETURNS BOOLEAN
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
            v_old_highscore INTEGER := 0;
            v_transaction_id UUID;
        BEGIN
            -- Transacoes de score guardam o recorde do usuario
            SELECT id, amount INTO v_transaction_id, v_old_highscore
            FROM public.transactions
            WHERE user_id = p_user_id AND type = 'race_score'
            ORDER BY amount DESC
            LIMIT 1;

            IF p_score > v_old_highscore THEN
                INSERT INTO public.transactions (user_id, type, amount, status)
                VALUES (p_user_id, 'race_score', p_score, 'approved');
                RETURN TRUE;
            END IF;

            RETURN FALSE; -- Nao superou recorde
        END;
        $$;
        
        NOTIFY pgrst, 'reload schema';
        `);
        console.log("RPC Functions created successfully!");
    } catch (err) {
        console.error("Error creating RPC functions:", err);
    } finally {
        await client.end();
    }
}

run();
