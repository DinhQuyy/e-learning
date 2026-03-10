CREATE TABLE IF NOT EXISTS ai_daily_metrics (
    metric_date DATE PRIMARY KEY,
    total_requests INT NOT NULL DEFAULT 0,
    p95_latency_ms INT NOT NULL DEFAULT 0,
    blocked_requests INT NOT NULL DEFAULT 0,
    cache_hit_ratio NUMERIC(6,4) NOT NULL DEFAULT 0,
    fallback_rate NUMERIC(6,4) NOT NULL DEFAULT 0,
    positive_feedback INT NOT NULL DEFAULT 0,
    negative_feedback INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

