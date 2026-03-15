ALTER TABLE mentor_recommendations
    ADD COLUMN IF NOT EXISTS dismiss_reason TEXT NULL;

CREATE TABLE IF NOT EXISTS mentor_interventions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id UUID NOT NULL,
    student_id UUID NOT NULL,
    course_id UUID NOT NULL,
    lesson_id UUID NULL,
    recommendation_id UUID NULL REFERENCES mentor_recommendations(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    channel TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    sent_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'mentor_interventions_action_type_check'
    ) THEN
        ALTER TABLE mentor_interventions
            ADD CONSTRAINT mentor_interventions_action_type_check
            CHECK (action_type IN ('nudge', 'micro_plan', 'recovery_plan'));
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'mentor_interventions_channel_check'
    ) THEN
        ALTER TABLE mentor_interventions
            ADD CONSTRAINT mentor_interventions_channel_check
            CHECK (channel IN ('in_app', 'email', 'multi'));
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'mentor_interventions_status_check'
    ) THEN
        ALTER TABLE mentor_interventions
            ADD CONSTRAINT mentor_interventions_status_check
            CHECK (status IN ('sent', 'failed'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_mentor_recommendations_dismissed
    ON mentor_recommendations (user_id, dismissed_at DESC)
    WHERE dismissed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mentor_interventions_student_created
    ON mentor_interventions (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mentor_interventions_course_created
    ON mentor_interventions (course_id, created_at DESC);
