from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from .db import fetch_one, get_db


def ensure_conversation(conversation_id: str | None, user_id: str, mode: str, course_id: str | None) -> str:
    if conversation_id:
        existing = fetch_one('SELECT id FROM ai_conversations WHERE id = %s', (conversation_id,))
        if existing:
            return str(existing['id'])

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO ai_conversations (user_id, mode, course_id, created_at)
                VALUES (%s, %s, %s, %s)
                RETURNING id
                """,
                (user_id, mode, course_id, datetime.now(tz=timezone.utc)),
            )
            row = cur.fetchone()
            return str(row['id'])


def log_message(
    conversation_id: str,
    role: str,
    content: str,
    retrieved_chunk_ids: list[str] | None = None,
    latency_ms: int | None = None,
    prompt_tokens: int | None = None,
    completion_tokens: int | None = None,
    model: str | None = None,
) -> str:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO ai_messages (
                    conversation_id,
                    role,
                    content,
                    retrieved_chunk_ids,
                    latency_ms,
                    prompt_tokens,
                    completion_tokens,
                    model,
                    created_at
                ) VALUES (%s, %s, %s, %s::jsonb, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    conversation_id,
                    role,
                    content,
                    json.dumps(retrieved_chunk_ids or []),
                    latency_ms,
                    prompt_tokens,
                    completion_tokens,
                    model,
                    datetime.now(tz=timezone.utc),
                ),
            )
            row = cur.fetchone()
            return str(row['id'])


def log_policy_violation(user_id: str, mode: str, reason: str) -> None:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO ai_policy_violations (user_id, mode, reason, created_at)
                VALUES (%s, %s, %s, %s)
                """,
                (user_id, mode, reason, datetime.now(tz=timezone.utc)),
            )


def save_feedback(
    user_id: str,
    conversation_id: str,
    message_id: str,
    mode: str,
    rating: int,
    comment: str | None = None,
    include_in_training: bool = True,
) -> str:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO ai_feedback (
                    user_id,
                    conversation_id,
                    message_id,
                    mode,
                    rating,
                    comment,
                    include_in_training,
                    created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (user_id, message_id)
                DO UPDATE SET
                    rating = EXCLUDED.rating,
                    comment = EXCLUDED.comment,
                    include_in_training = EXCLUDED.include_in_training,
                    created_at = NOW()
                RETURNING id
                """,
                (
                    user_id,
                    conversation_id,
                    message_id,
                    mode,
                    rating,
                    comment,
                    include_in_training,
                    datetime.now(tz=timezone.utc),
                ),
            )
            row = cur.fetchone()
            return str(row['id'])


def list_feedback_training_examples(mode: str, limit: int = 30) -> list[dict[str, Any]]:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    f.id AS feedback_id,
                    f.mode AS mode,
                    f.comment AS comment,
                    u.content AS user_query,
                    a.content AS assistant_content,
                    f.created_at AS created_at
                FROM ai_feedback f
                JOIN ai_messages a
                  ON a.id = f.message_id
                JOIN LATERAL (
                    SELECT content
                    FROM ai_messages um
                    WHERE um.conversation_id = a.conversation_id
                      AND um.role = 'user'
                      AND um.created_at <= a.created_at
                    ORDER BY um.created_at DESC
                    LIMIT 1
                ) u ON TRUE
                WHERE f.mode = %s
                  AND f.rating = 1
                  AND f.include_in_training = TRUE
                  AND a.content NOT LIKE '%%"fallback_used": true%%'
                  AND a.content NOT LIKE '%%"fallback_used":true%%'
                ORDER BY f.created_at DESC
                LIMIT %s
                """,
                (mode, max(limit, 1)),
            )
            return list(cur.fetchall())


def record_event(
    user_id: str,
    course_id: str,
    lesson_id: str | None,
    event_type: str,
    duration_sec: int,
    metadata: dict[str, Any],
) -> None:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO learning_events (
                    user_id,
                    course_id,
                    lesson_id,
                    event_type,
                    duration_sec,
                    metadata,
                    created_at
                ) VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s)
                """,
                (
                    user_id,
                    course_id,
                    lesson_id,
                    event_type,
                    max(duration_sec, 0),
                    json.dumps(metadata or {}),
                    datetime.now(tz=timezone.utc),
                ),
            )


def refresh_learning_progress(user_id: str, course_id: str) -> None:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                WITH agg AS (
                    SELECT
                        COALESCE(SUM(duration_sec), 0) AS time_spent_week_sec,
                        MAX(created_at) AS last_activity_at,
                        COUNT(*) FILTER (WHERE event_type = 'lesson_complete') AS completed_events
                    FROM learning_events
                    WHERE user_id = %s
                      AND course_id = %s
                      AND created_at >= NOW() - INTERVAL '7 days'
                )
                INSERT INTO learning_progress (
                    user_id,
                    course_id,
                    progress_pct,
                    overdue_count,
                    last_activity_at,
                    streak_days,
                    time_spent_week_sec,
                    updated_at
                )
                SELECT
                    %s,
                    %s,
                    LEAST(100, GREATEST(0, completed_events * 10))::numeric,
                    0,
                    last_activity_at,
                    0,
                    time_spent_week_sec,
                    NOW()
                FROM agg
                ON CONFLICT (user_id, course_id)
                DO UPDATE SET
                    progress_pct = EXCLUDED.progress_pct,
                    last_activity_at = EXCLUDED.last_activity_at,
                    time_spent_week_sec = EXCLUDED.time_spent_week_sec,
                    updated_at = NOW()
                """,
                (user_id, course_id, user_id, course_id),
            )


def refresh_recent_learning_progress(window_minutes: int = 10) -> None:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT DISTINCT user_id, course_id
                FROM learning_events
                WHERE created_at >= NOW() - (CAST(%s AS text) || ' minutes')::interval
                """,
                (window_minutes,),
            )
            rows = list(cur.fetchall())

    for row in rows:
        refresh_learning_progress(str(row['user_id']), str(row['course_id']))


def get_metrics() -> dict[str, float | int]:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT COUNT(*)::int AS total
                FROM ai_messages
                WHERE role = 'assistant'
                  AND created_at >= NOW() - INTERVAL '24 hours'
                """
            )
            total = cur.fetchone()['total']

            cur.execute(
                """
                SELECT COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms), 0)::int AS p95
                FROM ai_messages
                WHERE role = 'assistant'
                  AND created_at >= NOW() - INTERVAL '24 hours'
                  AND latency_ms IS NOT NULL
                """
            )
            p95 = cur.fetchone()['p95']

            cur.execute(
                """
                SELECT COUNT(*)::int AS blocked
                FROM ai_policy_violations
                WHERE created_at >= NOW() - INTERVAL '24 hours'
                """
            )
            blocked = cur.fetchone()['blocked']

            cur.execute(
                """
                SELECT
                  COUNT(*) FILTER (WHERE content LIKE '%%"cache_hit": true%%')::int AS hit,
                  COUNT(*) FILTER (WHERE content LIKE '%%"cache_hit": false%%')::int AS miss,
                  COUNT(*) FILTER (
                    WHERE content LIKE '%%"fallback_used": true%%'
                       OR content LIKE '%%"fallback_used":true%%'
                  )::int AS fallback_count
                FROM ai_messages
                WHERE role = 'assistant'
                  AND created_at >= NOW() - INTERVAL '24 hours'
                """
            )
            row = cur.fetchone()
            hit = int(row['hit'])
            miss = int(row['miss'])
            fallback_count = int(row['fallback_count'])

            cur.execute(
                """
                SELECT
                    COUNT(*) FILTER (WHERE rating = 1)::int AS positive_feedback,
                    COUNT(*) FILTER (WHERE rating = -1)::int AS negative_feedback
                FROM ai_feedback
                WHERE created_at >= NOW() - INTERVAL '24 hours'
                """
            )
            feedback = cur.fetchone()
            positive_feedback = int(feedback['positive_feedback'])
            negative_feedback = int(feedback['negative_feedback'])

    ratio = 0.0 if (hit + miss) == 0 else hit / (hit + miss)
    fallback_rate = 0.0 if total == 0 else fallback_count / total
    return {
        'total_requests_24h': int(total),
        'p95_latency_ms': int(p95),
        'blocked_requests_24h': int(blocked),
        'cache_hit_ratio': float(round(ratio, 4)),
        'fallback_rate_24h': float(round(fallback_rate, 4)),
        'positive_feedback_24h': int(positive_feedback),
        'negative_feedback_24h': int(negative_feedback),
    }


def upsert_daily_metrics(metric_date: str) -> None:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                WITH base AS (
                    SELECT
                        COUNT(*)::int AS total_requests,
                        COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms), 0)::int AS p95_latency_ms,
                        COUNT(*) FILTER (
                            WHERE content LIKE '%%"cache_hit": true%%'
                        )::int AS cache_hit_count,
                        COUNT(*) FILTER (
                            WHERE content LIKE '%%"cache_hit": false%%'
                        )::int AS cache_miss_count,
                        COUNT(*) FILTER (
                            WHERE content LIKE '%%"fallback_used": true%%'
                               OR content LIKE '%%"fallback_used":true%%'
                        )::int AS fallback_count
                    FROM ai_messages
                    WHERE role = 'assistant'
                      AND created_at >= CAST(%s AS date)
                      AND created_at < CAST(%s AS date) + INTERVAL '1 day'
                ),
                blocked AS (
                    SELECT COUNT(*)::int AS blocked_requests
                    FROM ai_policy_violations
                    WHERE created_at >= CAST(%s AS date)
                      AND created_at < CAST(%s AS date) + INTERVAL '1 day'
                ),
                feedback AS (
                    SELECT
                        COUNT(*) FILTER (WHERE rating = 1)::int AS positive_feedback,
                        COUNT(*) FILTER (WHERE rating = -1)::int AS negative_feedback
                    FROM ai_feedback
                    WHERE created_at >= CAST(%s AS date)
                      AND created_at < CAST(%s AS date) + INTERVAL '1 day'
                )
                INSERT INTO ai_daily_metrics (
                    metric_date,
                    total_requests,
                    p95_latency_ms,
                    blocked_requests,
                    cache_hit_ratio,
                    fallback_rate,
                    positive_feedback,
                    negative_feedback,
                    created_at,
                    updated_at
                )
                SELECT
                    CAST(%s AS date),
                    base.total_requests,
                    base.p95_latency_ms,
                    blocked.blocked_requests,
                    CASE
                        WHEN (base.cache_hit_count + base.cache_miss_count) = 0 THEN 0
                        ELSE ROUND((base.cache_hit_count::numeric / (base.cache_hit_count + base.cache_miss_count)::numeric), 4)
                    END AS cache_hit_ratio,
                    CASE
                        WHEN base.total_requests = 0 THEN 0
                        ELSE ROUND((base.fallback_count::numeric / base.total_requests::numeric), 4)
                    END AS fallback_rate,
                    feedback.positive_feedback,
                    feedback.negative_feedback,
                    NOW(),
                    NOW()
                FROM base, blocked, feedback
                ON CONFLICT (metric_date)
                DO UPDATE SET
                    total_requests = EXCLUDED.total_requests,
                    p95_latency_ms = EXCLUDED.p95_latency_ms,
                    blocked_requests = EXCLUDED.blocked_requests,
                    cache_hit_ratio = EXCLUDED.cache_hit_ratio,
                    fallback_rate = EXCLUDED.fallback_rate,
                    positive_feedback = EXCLUDED.positive_feedback,
                    negative_feedback = EXCLUDED.negative_feedback,
                    updated_at = NOW()
                """,
                (
                    metric_date,
                    metric_date,
                    metric_date,
                    metric_date,
                    metric_date,
                    metric_date,
                    metric_date,
                ),
            )


def get_daily_metrics(days: int = 14) -> list[dict[str, Any]]:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    metric_date,
                    total_requests,
                    p95_latency_ms,
                    blocked_requests,
                    cache_hit_ratio,
                    fallback_rate,
                    positive_feedback,
                    negative_feedback
                FROM ai_daily_metrics
                WHERE metric_date >= CURRENT_DATE - (CAST(%s AS int) - 1)
                ORDER BY metric_date DESC
                """,
                (max(days, 1),),
            )
            return list(cur.fetchall())
