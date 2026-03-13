from __future__ import annotations

import hashlib
import json
from typing import Any

from .config import get_settings
from .db import get_db
from .llm import embed_texts
from .redis_client import get_redis


def _visibility_for_role(role: str) -> tuple[str, ...]:
    role = role.lower()
    if role == 'admin':
        return ('public', 'enrolled_only', 'instructor_only', 'admin_only')
    if role == 'instructor':
        return ('public', 'enrolled_only', 'instructor_only')
    return ('public', 'enrolled_only')


def _cache_key_with_filters(
    mode: str,
    role: str,
    query: str,
    course_id: str | None,
    source_types: tuple[str, ...] | None,
    max_distance: float | None,
) -> str:
    normalized_query = ' '.join(query.lower().split())
    source_part = ','.join(source_types or ())
    distance_part = '' if max_distance is None else f'{max_distance:.4f}'
    raw = f"{mode}:{role}:{normalized_query}:{course_id or ''}:{source_part}:{distance_part}"
    h = hashlib.sha256(raw.encode('utf-8')).hexdigest()
    return f'ai:retrieval:{h}'


def retrieve_chunks(
    mode: str,
    role: str,
    query: str,
    course_id: str | None,
    top_k: int | None = None,
    source_types: tuple[str, ...] | None = None,
    max_distance: float | None = None,
    null_course_only: bool = False,
) -> tuple[list[dict[str, Any]], bool]:
    settings = get_settings()
    redis = get_redis()
    cache_key = _cache_key_with_filters(mode, role, query, course_id, source_types, max_distance)

    cached = redis.get(cache_key)
    if cached:
        return json.loads(cached), True

    vector = embed_texts([query])[0]
    vector_literal = '[' + ','.join(f'{v:.8f}' for v in vector) + ']'
    k = top_k or settings.retrieval_top_k
    visibilities = _visibility_for_role(role)

    with get_db() as conn:
        with conn.cursor() as cur:
            if course_id:
                if source_types:
                    cur.execute(
                        """
                        SELECT kc.id, kc.document_id, kc.chunk_text, kc.course_id, kc.visibility,
                               kd.title AS document_title,
                               kd.source_type, kd.source_id, (kc.embedding <=> %s::vector) AS distance
                        FROM knowledge_chunks kc
                        JOIN knowledge_documents kd ON kd.id = kc.document_id
                        WHERE kc.visibility = ANY(%s)
                          AND (kc.course_id = %s OR kc.course_id IS NULL)
                          AND kd.source_type = ANY(%s)
                        ORDER BY kc.embedding <=> %s::vector
                        LIMIT %s
                        """,
                        (
                            vector_literal,
                            list(visibilities),
                            course_id,
                            list(source_types),
                            vector_literal,
                            k,
                        ),
                    )
                else:
                    cur.execute(
                        """
                        SELECT kc.id, kc.document_id, kc.chunk_text, kc.course_id, kc.visibility,
                               kd.title AS document_title,
                               kd.source_type, kd.source_id, (kc.embedding <=> %s::vector) AS distance
                        FROM knowledge_chunks kc
                        JOIN knowledge_documents kd ON kd.id = kc.document_id
                        WHERE kc.visibility = ANY(%s)
                          AND (kc.course_id = %s OR kc.course_id IS NULL)
                        ORDER BY kc.embedding <=> %s::vector
                        LIMIT %s
                        """,
                        (vector_literal, list(visibilities), course_id, vector_literal, k),
                    )
            else:
                if source_types:
                    if null_course_only:
                        cur.execute(
                            """
                            SELECT kc.id, kc.document_id, kc.chunk_text, kc.course_id, kc.visibility,
                                   kd.title AS document_title,
                                   kd.source_type, kd.source_id, (kc.embedding <=> %s::vector) AS distance
                            FROM knowledge_chunks kc
                            JOIN knowledge_documents kd ON kd.id = kc.document_id
                            WHERE kc.visibility = ANY(%s)
                              AND kc.course_id IS NULL
                              AND kd.source_type = ANY(%s)
                            ORDER BY kc.embedding <=> %s::vector
                            LIMIT %s
                            """,
                            (
                                vector_literal,
                                list(visibilities),
                                list(source_types),
                                vector_literal,
                                k,
                            ),
                        )
                    else:
                        cur.execute(
                            """
                            SELECT kc.id, kc.document_id, kc.chunk_text, kc.course_id, kc.visibility,
                                   kd.title AS document_title,
                                   kd.source_type, kd.source_id, (kc.embedding <=> %s::vector) AS distance
                            FROM knowledge_chunks kc
                            JOIN knowledge_documents kd ON kd.id = kc.document_id
                            WHERE kc.visibility = ANY(%s)
                              AND kd.source_type = ANY(%s)
                            ORDER BY kc.embedding <=> %s::vector
                            LIMIT %s
                            """,
                            (
                                vector_literal,
                                list(visibilities),
                                list(source_types),
                                vector_literal,
                                k,
                            ),
                        )
                else:
                    if null_course_only:
                        cur.execute(
                            """
                            SELECT kc.id, kc.document_id, kc.chunk_text, kc.course_id, kc.visibility,
                                   kd.title AS document_title,
                                   kd.source_type, kd.source_id, (kc.embedding <=> %s::vector) AS distance
                            FROM knowledge_chunks kc
                            JOIN knowledge_documents kd ON kd.id = kc.document_id
                            WHERE kc.visibility = ANY(%s)
                              AND kc.course_id IS NULL
                            ORDER BY kc.embedding <=> %s::vector
                            LIMIT %s
                            """,
                            (vector_literal, list(visibilities), vector_literal, k),
                        )
                    else:
                        cur.execute(
                            """
                            SELECT kc.id, kc.document_id, kc.chunk_text, kc.course_id, kc.visibility,
                                   kd.title AS document_title,
                                   kd.source_type, kd.source_id, (kc.embedding <=> %s::vector) AS distance
                            FROM knowledge_chunks kc
                            JOIN knowledge_documents kd ON kd.id = kc.document_id
                            WHERE kc.visibility = ANY(%s)
                            ORDER BY kc.embedding <=> %s::vector
                            LIMIT %s
                            """,
                            (vector_literal, list(visibilities), vector_literal, k),
                        )
            rows = list(cur.fetchall())

    threshold = settings.retrieval_max_distance if max_distance is None else max_distance
    filtered = [
        row
        for row in rows
        if float(row.get('distance') or 999) <= threshold
    ]

    redis.setex(cache_key, settings.retrieval_cache_ttl_sec, json.dumps(filtered, default=str))
    return filtered, False


def format_context(chunks: list[dict[str, Any]]) -> str:
    if not chunks:
        return '<<<CONTEXT>>>\n\n<<<END_CONTEXT>>>'

    lines = ['<<<CONTEXT>>>']
    for index, chunk in enumerate(chunks, start=1):
        cid = chunk.get('id')
        text = chunk.get('chunk_text', '')
        source_type = str(chunk.get('source_type') or '').strip()
        source_id = str(chunk.get('source_id') or '').strip()
        title = str(chunk.get('document_title') or '').strip()
        meta_parts = [f"chunk_id={cid}"]
        if source_type:
            meta_parts.append(f"source_type={source_type}")
        if source_id:
            meta_parts.append(f"source_id={source_id}")
        if title:
            meta_parts.append(f"title={json.dumps(title, ensure_ascii=False)}")
        lines.append(f"[{index}] {' '.join(meta_parts)}: {text}")
    lines.append('<<<END_CONTEXT>>>')
    return '\n'.join(lines)
