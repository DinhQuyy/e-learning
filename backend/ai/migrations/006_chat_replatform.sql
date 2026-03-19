DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ai_conversations_mode_check'
    ) THEN
        ALTER TABLE ai_conversations
            DROP CONSTRAINT ai_conversations_mode_check;
    END IF;
END $$;

ALTER TABLE ai_conversations
    ADD CONSTRAINT ai_conversations_mode_check
    CHECK (mode IN ('chat', 'helpdesk', 'mentor', 'references', 'assignment'));

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ai_feedback_mode_check'
    ) THEN
        ALTER TABLE ai_feedback
            DROP CONSTRAINT ai_feedback_mode_check;
    END IF;
END $$;

ALTER TABLE ai_feedback
    ADD CONSTRAINT ai_feedback_mode_check
    CHECK (mode IN ('chat', 'helpdesk', 'mentor', 'references', 'assignment'));

ALTER TABLE ai_messages
    ADD COLUMN IF NOT EXISTS provider TEXT NULL,
    ADD COLUMN IF NOT EXISTS openai_response_id TEXT NULL,
    ADD COLUMN IF NOT EXISTS tool_trace JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS tool_calls_count INT NOT NULL DEFAULT 0;

DROP TABLE IF EXISTS mentor_interventions;
DROP TABLE IF EXISTS mentor_recommendations;
DROP TABLE IF EXISTS learning_progress;
DROP TABLE IF EXISTS learning_events;
DROP TABLE IF EXISTS knowledge_chunks;
DROP TABLE IF EXISTS knowledge_documents;

DROP EXTENSION IF EXISTS vector;
