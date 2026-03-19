CREATE TABLE IF NOT EXISTS ai_course_advisor_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL,
    content_hash TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    model TEXT NOT NULL,
    source_state TEXT NOT NULL CHECK (source_state IN ('full_course_context', 'metadata_only')),
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (course_id, content_hash, prompt_version, model)
);

CREATE INDEX IF NOT EXISTS idx_ai_course_advisor_cache_lookup
    ON ai_course_advisor_cache (course_id, prompt_version, model, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_course_advisor_cache_accessed
    ON ai_course_advisor_cache (last_accessed_at DESC);
