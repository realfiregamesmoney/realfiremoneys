-- Force create quiz events table if it really doesn't exist for some reason
CREATE TABLE IF NOT EXISTS public.quiz_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMPTZ NOT NULL,
    ticket_price DECIMAL(10,2) DEFAULT 0.00,
    prize_type TEXT CHECK (prize_type IN ('cash', 'product')),
    prize_product_name TEXT,
    prize_product_image TEXT,
    prize_product_value DECIMAL(10,2),
    questions JSONB NOT NULL DEFAULT '[]',
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'finished')),
    platform_fee_percent DECIMAL(5,2) DEFAULT 30.00,
    validated_winner_id UUID REFERENCES public.profiles(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Quiz Tickets Table
CREATE TABLE IF NOT EXISTS public.quiz_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES public.quiz_events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    payment_method TEXT DEFAULT 'pix_external',
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Quiz Responses Table
CREATE TABLE IF NOT EXISTS public.quiz_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES public.quiz_events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    question_index INTEGER NOT NULL,
    answer_index INTEGER NOT NULL,
    is_correct BOOLEAN NOT NULL,
    time_ms INTEGER NOT NULL, 
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Quiz Rankings Table
CREATE TABLE IF NOT EXISTS public.quiz_rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES public.quiz_events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    total_correct INTEGER DEFAULT 0,
    total_time_ms BIGINT DEFAULT 0,
    finished_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(quiz_id, user_id)
);

ALTER TABLE public.quiz_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_rankings ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.quiz_events IS 'Mega Quiz Events Table Force Reload';
NOTIFY pgrst, 'reload schema';
