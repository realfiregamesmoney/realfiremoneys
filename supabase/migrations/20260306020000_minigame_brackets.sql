
-- Tournament rooms for mini games
CREATE TABLE IF NOT EXISTS public.minigame_tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id TEXT REFERENCES public.minigame_configs(id),
    status TEXT DEFAULT 'waiting', -- 'waiting', 'in_progress', 'finished'
    current_round INTEGER DEFAULT 0, -- 0=Waiting, 1=Quarters, 2=Semis, 3=Final
    winner_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Participants in a tournament
CREATE TABLE IF NOT EXISTS public.minigame_tournament_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES public.minigame_tournaments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    slot_index INTEGER, -- 0-7
    status TEXT DEFAULT 'alive', -- 'alive', 'eliminated'
    nickname TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tournament_id, slot_index),
    UNIQUE(tournament_id, user_id)
);

-- Individual matches in the tournament
CREATE TABLE IF NOT EXISTS public.minigame_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES public.minigame_tournaments(id) ON DELETE CASCADE,
    round INTEGER, -- 1=QF, 2=SF, 3=Final
    match_index INTEGER, -- 0-3 for QF, 0-1 for SF, 0 for Final
    player1_id UUID REFERENCES auth.users(id),
    player2_id UUID REFERENCES auth.users(id),
    winner_id UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'pending', -- 'pending', 'playing', 'finished'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.minigame_tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.minigame_tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.minigame_matches ENABLE ROW LEVEL SECURITY;

-- Simple public policies
CREATE POLICY "Anyone can view minigame tournaments" ON public.minigame_tournaments FOR SELECT USING (true);
CREATE POLICY "Anyone can view minigame participants" ON public.minigame_tournament_participants FOR SELECT USING (true);
CREATE POLICY "Anyone can view minigame matches" ON public.minigame_matches FOR SELECT USING (true);

-- Allow authenticated users to join tournaments
CREATE POLICY "Authenticated join tournament" ON public.minigame_tournament_participants FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger to start tournament when 8 players join
CREATE OR REPLACE FUNCTION public.start_minigame_tournament()
RETURNS TRIGGER AS $$
DECLARE
    p_count INTEGER;
    t_id UUID;
BEGIN
    t_id := NEW.tournament_id;
    
    SELECT count(*) INTO p_count FROM public.minigame_tournament_participants WHERE tournament_id = t_id;
    
    IF p_count = 8 THEN
        -- 1. Update tournament status
        UPDATE public.minigame_tournaments 
        SET status = 'in_progress', current_round = 1 
        WHERE id = t_id;
        
        -- 2. Generate Quarter-Final Matches
        INSERT INTO public.minigame_matches (tournament_id, round, match_index, player1_id, player2_id)
        SELECT t_id, 1, 0, p0.user_id, p1.user_id
        FROM public.minigame_tournament_participants p0, public.minigame_tournament_participants p1
        WHERE p0.tournament_id = t_id AND p0.slot_index = 0
          AND p1.tournament_id = t_id AND p1.slot_index = 1;

        INSERT INTO public.minigame_matches (tournament_id, round, match_index, player1_id, player2_id)
        SELECT t_id, 1, 1, p2.user_id, p3.user_id
        FROM public.minigame_tournament_participants p2, public.minigame_tournament_participants p3
        WHERE p2.tournament_id = t_id AND p2.slot_index = 2
          AND p3.tournament_id = t_id AND p3.slot_index = 3;

        INSERT INTO public.minigame_matches (tournament_id, round, match_index, player1_id, player2_id)
        SELECT t_id, 1, 2, p4.user_id, p5.user_id
        FROM public.minigame_tournament_participants p4, public.minigame_tournament_participants p5
        WHERE p4.tournament_id = t_id AND p4.slot_index = 4
          AND p5.tournament_id = t_id AND p5.slot_index = 5;

        INSERT INTO public.minigame_matches (tournament_id, round, match_index, player1_id, player2_id)
        SELECT t_id, 1, 3, p6.user_id, p7.user_id
        FROM public.minigame_tournament_participants p6, public.minigame_tournament_participants p7
        WHERE p6.tournament_id = t_id AND p6.slot_index = 6
          AND p7.tournament_id = t_id AND p7.slot_index = 7;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_minigame_participant_joined
AFTER INSERT ON public.minigame_tournament_participants
FOR EACH ROW EXECUTE FUNCTION public.start_minigame_tournament();

-- Trigger to advance rounds when matches finish
CREATE OR REPLACE FUNCTION public.advance_minigame_round()
RETURNS TRIGGER AS $$
DECLARE
    m_count INTEGER;
    f_count INTEGER;
    t_id UUID;
    curr_round INTEGER;
BEGIN
    t_id := NEW.tournament_id;
    curr_round := NEW.round;
    
    -- Count total matches in this round
    SELECT count(*) INTO m_count FROM public.minigame_matches 
    WHERE tournament_id = t_id AND round = curr_round;
    
    -- Count finished matches in this round
    SELECT count(*) INTO f_count FROM public.minigame_matches 
    WHERE tournament_id = t_id AND round = curr_round AND status = 'finished';
    
    -- 1. Marcar perdedor como eliminado (Juiz Invisível - Garantia definitiva)
    IF NEW.winner_id IS NOT NULL THEN
        UPDATE public.minigame_tournament_participants
        SET status = 'eliminated'
        WHERE tournament_id = t_id
        AND user_id = (CASE WHEN NEW.player1_id = NEW.winner_id THEN NEW.player2_id ELSE NEW.player1_id END);
    END IF;

    IF m_count = f_count AND m_count > 0 THEN
        -- All matches in this round finished
        IF curr_round = 1 THEN
            -- QF finished -> Generate SF
            INSERT INTO public.minigame_matches (tournament_id, round, match_index, player1_id, player2_id)
            SELECT t_id, 2, 0, m0.winner_id, m1.winner_id
            FROM public.minigame_matches m0, public.minigame_matches m1
            WHERE m0.tournament_id = t_id AND m0.round = 1 AND m0.match_index = 0
              AND m1.tournament_id = t_id AND m1.round = 1 AND m1.match_index = 1;

            INSERT INTO public.minigame_matches (tournament_id, round, match_index, player1_id, player2_id)
            SELECT t_id, 2, 1, m2.winner_id, m3.winner_id
            FROM public.minigame_matches m2, public.minigame_matches m3
            WHERE m2.tournament_id = t_id AND m2.round = 1 AND m2.match_index = 2
              AND m3.tournament_id = t_id AND m3.round = 1 AND m3.match_index = 3;
            
            UPDATE public.minigame_tournaments SET current_round = 2 WHERE id = t_id;
            
        ELSIF curr_round = 2 THEN
            -- SF finished -> Generate Final
            INSERT INTO public.minigame_matches (tournament_id, round, match_index, player1_id, player2_id)
            SELECT t_id, 3, 0, m0.winner_id, m1.winner_id
            FROM public.minigame_matches m0, public.minigame_matches m1
            WHERE m0.tournament_id = t_id AND m0.round = 2 AND m0.match_index = 0
              AND m1.tournament_id = t_id AND m1.round = 2 AND m1.match_index = 1;
            
            UPDATE public.minigame_tournaments SET current_round = 3 WHERE id = t_id;
            
        ELSIF curr_round = 3 THEN
            -- Final finished -> End tournament
            UPDATE public.minigame_tournaments 
            SET status = 'finished', winner_id = NEW.winner_id 
            WHERE id = t_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_minigame_match_finished
AFTER UPDATE OF status ON public.minigame_matches
FOR EACH ROW 
WHEN (NEW.status = 'finished' AND OLD.status <> 'finished')
EXECUTE FUNCTION public.advance_minigame_round();

-- Keep track of moves for real-time synchronization
CREATE TABLE IF NOT EXISTS public.minigame_moves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES public.minigame_matches(id) ON DELETE CASCADE,
    player_id UUID REFERENCES auth.users(id),
    move_data JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.minigame_moves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view minigame moves" ON public.minigame_moves FOR SELECT USING (true);
CREATE POLICY "Players can insert minigame moves" ON public.minigame_moves FOR INSERT WITH CHECK (auth.uid() = player_id);

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
