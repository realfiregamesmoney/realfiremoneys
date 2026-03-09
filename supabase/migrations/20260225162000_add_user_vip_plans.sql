CREATE TABLE IF NOT EXISTS user_vip_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL,
    plan_title TEXT NOT NULL,
    passes_available INTEGER NOT NULL DEFAULT 2,
    pass_value NUMERIC NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    last_reset_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, plan_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_vip_plans_user ON user_vip_plans(user_id);

-- Enable RLS
ALTER TABLE user_vip_plans ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own VIP plans"
ON user_vip_plans FOR SELECT
USING (auth.uid() = user_id);

-- Admin can manage all
CREATE POLICY "Admins can manage all VIP plans"
ON user_vip_plans FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid() AND is_admin = true
    )
);

-- Trigger to at least handle some auto-resets on update if needed (optional)
