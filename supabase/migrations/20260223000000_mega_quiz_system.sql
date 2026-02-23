-- Create Quiz Events Table
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(quiz_id, user_id)
);

-- Create Quiz Responses Table (Individual answers for ms tracking)
CREATE TABLE IF NOT EXISTS public.quiz_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES public.quiz_events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    question_index INTEGER NOT NULL,
    answer_index INTEGER NOT NULL,
    is_correct BOOLEAN NOT NULL,
    time_ms INTEGER NOT NULL, -- Time in milliseconds
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Quiz Rankings Table (Final results)
CREATE TABLE IF NOT EXISTS public.quiz_rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES public.quiz_events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    total_correct INTEGER DEFAULT 0,
    total_time_ms BIGINT DEFAULT 0,
    finished_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(quiz_id, user_id)
);

-- Enable RLS
ALTER TABLE public.quiz_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_rankings ENABLE ROW LEVEL SECURITY;

-- Policies for quiz_events
CREATE POLICY "Quiz events are viewable by everyone" ON public.quiz_events FOR SELECT USING (true);
CREATE POLICY "Admins can manage quiz events" ON public.quiz_events FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Policies for quiz_tickets
CREATE POLICY "Users can view their own tickets" ON public.quiz_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own tickets" ON public.quiz_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all tickets" ON public.quiz_tickets FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Policies for quiz_responses
CREATE POLICY "Users can view their own responses" ON public.quiz_responses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own responses" ON public.quiz_responses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all responses" ON public.quiz_responses FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Policies for quiz_rankings
CREATE POLICY "Rankings are viewable by everyone" ON public.quiz_rankings FOR SELECT USING (true);
CREATE POLICY "Users can insert their own rankings" ON public.quiz_rankings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all rankings" ON public.quiz_rankings FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Realtime enablement
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_rankings;
