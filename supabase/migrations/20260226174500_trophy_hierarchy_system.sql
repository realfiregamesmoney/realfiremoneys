-- Trophy and Medal Evolution System V3 (Definitive Sync)
-- This version aligns perfectly with AdminAchievements.tsx names and Profile.tsx thresholds.

CREATE OR REPLACE FUNCTION public.award_achievement(target_user_id uuid, achievement_type_pattern text)
RETURNS json AS $$
DECLARE
    final_achievement record;
    current_user_achievement record;
    new_count int;
    evolution_triggered boolean := false;
    
    -- Hierarchy variables
    next_level_name text;
    threshold int;
    is_trophy boolean;
BEGIN
    -- 1. Determine if we are awarding a trophy or a medal
    is_trophy := (achievement_type_pattern ILIKE '%trophy%' OR achievement_type_pattern ILIKE '%Troféu%');
    
    -- 2. Identify the 'highest' achievement of that type the user already has
    IF is_trophy THEN
        SELECT a.*, ua.count as current_count, ua.id as ua_id 
        INTO current_user_achievement
        FROM public.user_achievements ua
        JOIN public.achievements a ON a.id = ua.achievement_id
        WHERE ua.user_id = target_user_id AND a.type = 'trophy'
        ORDER BY 
            CASE 
                WHEN a.name ILIKE '%Invencível%' THEN 5
                WHEN a.name ILIKE '%Mestre%' THEN 4
                WHEN a.name ILIKE '%Veterano%' THEN 3
                WHEN a.name ILIKE '%Soldado%' THEN 2
                WHEN a.name ILIKE '%Recruta%' THEN 1
                ELSE 0
            END DESC
        LIMIT 1;
    ELSE
        -- Medal Logic
        SELECT a.*, ua.count as current_count, ua.id as ua_id 
        INTO current_user_achievement
        FROM public.user_achievements ua
        JOIN public.achievements a ON a.id = ua.achievement_id
        WHERE ua.user_id = target_user_id AND a.type = 'medal'
        ORDER BY 
            CASE 
                WHEN a.name ILIKE '%Participador VIP%' THEN 5
                WHEN a.name ILIKE '%Especial REAL FIRE%' THEN 4
                WHEN a.name ILIKE '%Veterano%' THEN 3
                WHEN a.name ILIKE '%Soldado%' THEN 2
                WHEN a.name ILIKE '%Recruta%' THEN 1
                ELSE 0
            END DESC
        LIMIT 1;
    END IF;
    
    -- 3. Initial state: if user has nothing of this type
    IF current_user_achievement IS NULL THEN
        IF is_trophy THEN
            SELECT * INTO final_achievement FROM public.achievements WHERE type = 'trophy' AND name ILIKE '%Troféu Recruta%' LIMIT 1;
        ELSE
            SELECT * INTO final_achievement FROM public.achievements WHERE type = 'medal' AND name ILIKE '%Medalha de Recruta%' LIMIT 1;
        END IF;

        IF final_achievement IS NULL THEN
            RETURN json_build_object('success', false, 'error', 'Base achievement not found. Run seed first.');
        END IF;
        
        INSERT INTO public.user_achievements (user_id, achievement_id, count, is_active)
        VALUES (target_user_id, final_achievement.id, 1, true);
        
        RETURN json_build_object('success', true, 'achievement', final_achievement, 'evolution', false, 'count', 1);
    END IF;

    -- 4. Current progress increment
    new_count := current_user_achievement.current_count + 1;
    
    -- 5. Threshold check (based on Profile.tsx logic)
    -- thresholds: Recruta(1), Soldado(10), Veterano(50), Mestre(100), Invencivel(150)
    threshold := CASE 
        WHEN current_user_achievement.name ILIKE '%Recruta%' THEN 10 -- Evolves TO Soldado when hitting 10
        WHEN current_user_achievement.name ILIKE '%Soldado%' THEN 50 -- Evolves TO Veterano when hitting 50
        WHEN current_user_achievement.name ILIKE '%Veterano%' THEN 100 -- Evolves TO Mestre/Especial when hitting 100
        WHEN current_user_achievement.name ILIKE '%Mestre%' OR current_user_achievement.name ILIKE '%Especial%' THEN 150 -- Evolves TO Invencível/VIP when hitting 150
        ELSE 999999 -- Max reached
    END;

    IF new_count >= threshold AND threshold < 999999 THEN
        -- Upgrade time!
        IF is_trophy THEN
            next_level_name := CASE 
                WHEN current_user_achievement.name ILIKE '%Recruta%' THEN 'Troféu Soldado'
                WHEN current_user_achievement.name ILIKE '%Soldado%' THEN 'Troféu Veterano'
                WHEN current_user_achievement.name ILIKE '%Veterano%' THEN 'Troféu Mestre REAL FIRE'
                WHEN current_user_achievement.name ILIKE '%Mestre%' THEN 'Troféu O Invencível'
            END;
        ELSE
            next_level_name := CASE 
                WHEN current_user_achievement.name ILIKE '%Recruta%' THEN 'Medalha de Soldado'
                WHEN current_user_achievement.name ILIKE '%Soldado%' THEN 'Medalha de Veterano'
                WHEN current_user_achievement.name ILIKE '%Veterano%' THEN 'Medalha Especial REAL FIRE'
                WHEN current_user_achievement.name ILIKE '%Especial%' THEN 'Medalha Participador VIP'
            END;
        END IF;
        
        SELECT * INTO final_achievement FROM public.achievements WHERE name = next_level_name LIMIT 1;
        
        IF final_achievement IS NOT NULL THEN
            evolution_triggered := true;
            
            -- Upsert next level
            INSERT INTO public.user_achievements (user_id, achievement_id, count, is_active)
            VALUES (target_user_id, final_achievement.id, 1, true)
            ON CONFLICT (user_id, achievement_id) DO UPDATE SET count = user_achievements.count + 1, is_active = true;
            
            -- Deactivate old one
            UPDATE public.user_achievements SET is_active = false WHERE id = current_user_achievement.ua_id;
            
            RETURN json_build_object('success', true, 'achievement', final_achievement, 'evolution', true, 'count', 1);
        END IF;
    END IF;

    -- 6. Normal increment if no evolution
    UPDATE public.user_achievements SET count = new_count, is_active = true WHERE id = current_user_achievement.ua_id;
    SELECT * INTO final_achievement FROM public.achievements WHERE id = current_user_achievement.id;
    
    RETURN json_build_object('success', true, 'achievement', final_achievement, 'evolution', false, 'count', new_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SEEDING: Ensure all levels exist with EXACT names used in the app
-- TROPHIES
INSERT INTO public.achievements (name, type, rarity, image_url, description)
SELECT 'Troféu Recruta', 'trophy', 'common', '/assets/achievements/trofeus_all.png', 'Novato audaz do Real Fire.'
WHERE NOT EXISTS (SELECT 1 FROM public.achievements WHERE name = 'Troféu Recruta');

INSERT INTO public.achievements (name, type, rarity, image_url, description)
SELECT 'Troféu Soldado', 'trophy', 'rare', '/assets/achievements/trofeus_all.png', 'Um combatente que provou seu valor.'
WHERE NOT EXISTS (SELECT 1 FROM public.achievements WHERE name = 'Troféu Soldado');

INSERT INTO public.achievements (name, type, rarity, image_url, description)
SELECT 'Troféu Veterano', 'trophy', 'epic', '/assets/achievements/trofeus_all.png', 'Mestre das estratégias e combate.'
WHERE NOT EXISTS (SELECT 1 FROM public.achievements WHERE name = 'Troféu Veterano');

INSERT INTO public.achievements (name, type, rarity, image_url, description)
SELECT 'Troféu Mestre REAL FIRE', 'trophy', 'legendary', '/assets/achievements/trophy_real_fire.png', 'A elite absoluta.'
WHERE NOT EXISTS (SELECT 1 FROM public.achievements WHERE name = 'Troféu Mestre REAL FIRE');

INSERT INTO public.achievements (name, type, rarity, image_url, description)
SELECT 'Troféu O Invencível', 'trophy', 'realfire', '/assets/achievements/trophy_real_fire.png', 'Uma lenda que nunca conheceu a derrota.'
WHERE NOT EXISTS (SELECT 1 FROM public.achievements WHERE name = 'Troféu O Invencível');

-- MEDALS
INSERT INTO public.achievements (name, type, rarity, image_url, description)
SELECT 'Medalha de Recruta', 'medal', 'common', '/assets/achievements/medalhas_all.png', 'O início da sua honra.'
WHERE NOT EXISTS (SELECT 1 FROM public.achievements WHERE name = 'Medalha de Recruta');

INSERT INTO public.achievements (name, type, rarity, image_url, description)
SELECT 'Medalha de Soldado', 'medal', 'common', '/assets/achievements/medalhas_all.png', 'Honra conquistada em batalha.'
WHERE NOT EXISTS (SELECT 1 FROM public.achievements WHERE name = 'Medalha de Soldado');

INSERT INTO public.achievements (name, type, rarity, image_url, description)
SELECT 'Medalha de Veterano', 'medal', 'silver', '/assets/achievements/medalhas_all.png', 'Resiliência e coragem demonstradas.'
WHERE NOT EXISTS (SELECT 1 FROM public.achievements WHERE name = 'Medalha de Veterano');

INSERT INTO public.achievements (name, type, rarity, image_url, description)
SELECT 'Medalha Especial REAL FIRE', 'medal', 'realfire', 'https://i.ibb.co/7xbmPMKV/Whats-App-Image-2026-02-24-at-22-28-34.jpg', 'O selo oficial dos heróis.'
WHERE NOT EXISTS (SELECT 1 FROM public.achievements WHERE name = 'Medalha Especial REAL FIRE');

INSERT INTO public.achievements (name, type, rarity, image_url, description)
SELECT 'Medalha Participador VIP', 'medal', 'vip', '/assets/achievements/medalhas_all.png', 'Presença constante no topo.'
WHERE NOT EXISTS (SELECT 1 FROM public.achievements WHERE name = 'Medalha Participador VIP');
