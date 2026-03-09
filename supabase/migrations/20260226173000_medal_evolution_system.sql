-- Medal Evolution and Award System
CREATE OR REPLACE FUNCTION public.award_achievement(target_user_id uuid, achievement_name_pattern text)
RETURNS json AS $$
DECLARE
    target_achievement record;
    current_count int;
    next_achievement record;
    evolution_triggered boolean := false;
    final_achievement record;
BEGIN
    -- Find the achievement
    SELECT * INTO target_achievement FROM public.achievements 
    WHERE name ILIKE achievement_name_pattern LIMIT 1;
    
    IF target_achievement IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Achievement not found (' || achievement_name_pattern || ')');
    END IF;

    -- Upsert and increment count
    INSERT INTO public.user_achievements (user_id, achievement_id, count, is_active)
    VALUES (target_user_id, target_achievement.id, 1, false)
    ON CONFLICT (user_id, achievement_id) DO UPDATE 
    SET count = user_achievements.count + 1
    RETURNING count INTO current_count;

    final_achievement := target_achievement;

    -- Evolution Logic
    -- Bronze -> Silver (10 Bronze = 1 Silver)
    IF target_achievement.name ILIKE '%Bronze%' AND current_count >= 10 THEN
        SELECT * INTO next_achievement FROM public.achievements 
        WHERE type = 'medal' AND name ILIKE '%Prata%' LIMIT 1;
        
        IF next_achievement IS NOT NULL THEN
            UPDATE public.user_achievements SET count = 0 WHERE user_id = target_user_id AND achievement_id = target_achievement.id;
            INSERT INTO public.user_achievements (user_id, achievement_id, count, is_active)
            VALUES (target_user_id, next_achievement.id, 1, false)
            ON CONFLICT (user_id, achievement_id) DO UPDATE 
            SET count = user_achievements.count + 1;
            
            evolution_triggered := true;
            final_achievement := next_achievement;
        END IF;
    END IF;

    -- Silver -> Gold (10 Silver = 1 Gold)
    IF NOT evolution_triggered AND target_achievement.name ILIKE '%Prata%' AND current_count >= 10 THEN
        SELECT * INTO next_achievement FROM public.achievements 
        WHERE type = 'medal' AND name ILIKE '%Ouro%' LIMIT 1;
        
        IF next_achievement IS NOT NULL THEN
            UPDATE public.user_achievements SET count = 0 WHERE user_id = target_user_id AND achievement_id = target_achievement.id;
            INSERT INTO public.user_achievements (user_id, achievement_id, count, is_active)
            VALUES (target_user_id, next_achievement.id, 1, false)
            ON CONFLICT (user_id, achievement_id) DO UPDATE 
            SET count = user_achievements.count + 1;
            
            evolution_triggered := true;
            final_achievement := next_achievement;
        END IF;
    END IF;

    RETURN json_build_object(
        'success', true, 
        'achievement', final_achievement, 
        'evolution', evolution_triggered,
        'original_count', current_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure required medals exist
INSERT INTO public.achievements (name, type, rarity, image_url, description)
SELECT 'Medalha de Bronze', 'medal', 'common', 'https://i.ibb.co/680pMMQ/bronze-medal.png', 'Conquistada por participar e lutar com bravura.'
WHERE NOT EXISTS (SELECT 1 FROM public.achievements WHERE name = 'Medalha de Bronze');

INSERT INTO public.achievements (name, type, rarity, image_url, description)
SELECT 'Medalha de Prata', 'medal', 'rare', 'https://i.ibb.co/G4qFMMQ/silver-medal.png', 'Evolução de quem domina o campo de batalha.'
WHERE NOT EXISTS (SELECT 1 FROM public.achievements WHERE name = 'Medalha de Prata');

INSERT INTO public.achievements (name, type, rarity, image_url, description)
SELECT 'Medalha de Ouro', 'medal', 'epic', 'https://i.ibb.co/VWVpMMQ/gold-medal.png', 'A glória máxima dos veteranos.'
WHERE NOT EXISTS (SELECT 1 FROM public.achievements WHERE name = 'Medalha de Ouro');

INSERT INTO public.achievements (name, type, rarity, image_url, description)
SELECT 'Troféu de Vencedor', 'trophy', 'realfire', 'https://i.ibb.co/v6hZMMQ/trophy-gold.png', 'O símbolo supremo de quem sobreviveu ao Mega Quiz.'
WHERE NOT EXISTS (SELECT 1 FROM public.achievements WHERE name = 'Troféu de Vencedor');
