CREATE TABLE IF NOT EXISTS ai_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES ai_messages(id) ON DELETE CASCADE,
    mode TEXT NOT NULL CHECK (mode IN ('helpdesk', 'mentor', 'references', 'assignment')),
    rating SMALLINT NOT NULL CHECK (rating IN (-1, 1)),
    comment TEXT NULL,
    include_in_training BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_mode_created
    ON ai_feedback (mode, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_training
    ON ai_feedback (include_in_training, rating, created_at DESC);

