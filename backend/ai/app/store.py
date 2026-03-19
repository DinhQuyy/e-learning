from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from .db import fetch_one, get_db


def ensure_conversation(conversation_id: str | None, user_id: str, course_id: str | None) -> str:
    if conversation_id:
        existing = fetch_one(
            """
            SELECT id
            FROM ai_conversations
            WHERE id = %s
              AND user_id = %s
            LIMIT 1
            """,
            (conversation_id, user_id),
        )
        if existing and existing.get("id"):
            return str(existing["id"])

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO ai_conversations (user_id, mode, course_id, created_at)
                VALUES (%s, %s, %s, %s)
                RETURNING id
                """,
                (user_id, "chat", course_id, datetime.now(tz=timezone.utc)),
            )
            row = cur.fetchone()
            return str(row["id"])


def get_latest_assistant_response_id(conversation_id: str) -> str | None:
    row = fetch_one(
        """
        SELECT openai_response_id
        FROM ai_messages
        WHERE conversation_id = %s
          AND role = 'assistant'
          AND openai_response_id IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 1
        """,
        (conversation_id,),
    )
    if not row or not row.get("openai_response_id"):
        return None
    return str(row["openai_response_id"])


def log_message(
    conversation_id: str,
    role: str,
    content: str,
    *,
    latency_ms: int | None = None,
    prompt_tokens: int | None = None,
    completion_tokens: int | None = None,
    model: str | None = None,
    provider: str | None = None,
    openai_response_id: str | None = None,
    tool_trace: list[dict[str, Any]] | None = None,
    tool_calls_count: int = 0,
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
                    provider,
                    openai_response_id,
                    tool_trace,
                    tool_calls_count,
                    created_at
                ) VALUES (
                    %s,
                    %s,
                    %s,
                    '[]'::jsonb,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s::jsonb,
                    %s,
                    %s
                )
                RETURNING id
                """,
                (
                    conversation_id,
                    role,
                    content,
                    latency_ms,
                    prompt_tokens,
                    completion_tokens,
                    model,
                    provider,
                    openai_response_id,
                    json.dumps(tool_trace or [], ensure_ascii=False),
                    max(int(tool_calls_count or 0), 0),
                    datetime.now(tz=timezone.utc),
                ),
            )
            row = cur.fetchone()
            return str(row["id"])


def save_feedback(
    user_id: str,
    conversation_id: str,
    message_id: str,
    rating: int,
    comment: str | None = None,
    include_in_training: bool = False,
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
                    "chat",
                    rating,
                    comment,
                    include_in_training,
                    datetime.now(tz=timezone.utc),
                ),
            )
            row = cur.fetchone()
            return str(row["id"])
