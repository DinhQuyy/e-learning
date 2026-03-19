CREATE TABLE IF NOT EXISTS ai_lesson_study_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL,
    mode TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    model TEXT NOT NULL,
    source_state TEXT NOT NULL CHECK (source_state IN ('full_lesson_body', 'metadata_only')),
    content_word_count INT NOT NULL DEFAULT 0,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (lesson_id, mode, content_hash, prompt_version, model)
);

CREATE INDEX IF NOT EXISTS idx_ai_lesson_study_cache_lookup
    ON ai_lesson_study_cache (lesson_id, mode, prompt_version, model, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_lesson_study_cache_accessed
    ON ai_lesson_study_cache (last_accessed_at DESC);
