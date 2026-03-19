CREATE TABLE IF NOT EXISTS ai_quiz_mistake_review_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL,
    quiz_id UUID NOT NULL,
    lesson_id UUID NULL,
    prompt_version TEXT NOT NULL,
    model TEXT NOT NULL,
    review_state TEXT NOT NULL CHECK (review_state IN ('has_mistakes', 'perfect_attempt')),
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (attempt_id, prompt_version, model)
);

CREATE INDEX IF NOT EXISTS idx_ai_quiz_mistake_review_cache_lookup
    ON ai_quiz_mistake_review_cache (attempt_id, prompt_version, model);

CREATE INDEX IF NOT EXISTS idx_ai_quiz_mistake_review_cache_accessed
    ON ai_quiz_mistake_review_cache (last_accessed_at DESC);
