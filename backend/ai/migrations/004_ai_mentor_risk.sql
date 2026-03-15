ALTER TABLE learning_progress
    ADD COLUMN IF NOT EXISTS inactive_days INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS failed_quiz_attempts_7d INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS weekly_completed_lessons INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS risk_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS risk_band TEXT NOT NULL DEFAULT 'low';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'learning_progress_risk_band_check'
    ) THEN
        ALTER TABLE learning_progress
            ADD CONSTRAINT learning_progress_risk_band_check
            CHECK (risk_band IN ('low', 'medium', 'high'));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS mentor_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    course_id UUID NOT NULL,
    lesson_id UUID NULL,
    title TEXT NOT NULL,
    reason TEXT NOT NULL,
    eta_min INT NOT NULL DEFAULT 0,
    cta_href TEXT NOT NULL,
    cta_label TEXT NOT NULL,
    source_bucket TEXT NOT NULL CHECK (source_bucket IN ('today_plan', 'overdue')),
    priority INT NOT NULL DEFAULT 0,
    risk_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    shown_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    clicked_at TIMESTAMPTZ NULL,
    completed_at TIMESTAMPTZ NULL,
    dismissed_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_learning_progress_course_risk
    ON learning_progress (course_id, risk_score DESC, last_activity_at ASC);

CREATE INDEX IF NOT EXISTS idx_mentor_recommendations_user_shown
    ON mentor_recommendations (user_id, shown_at DESC);

CREATE INDEX IF NOT EXISTS idx_mentor_recommendations_course_user
    ON mentor_recommendations (course_id, user_id, shown_at DESC);

CREATE INDEX IF NOT EXISTS idx_mentor_recommendations_lesson_open
    ON mentor_recommendations (user_id, course_id, lesson_id)
    WHERE completed_at IS NULL;
