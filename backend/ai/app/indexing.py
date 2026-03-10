from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone

from .db import fetch_one, get_db
from .llm import embed_texts
from .models import CustomQaItem, IndexDocumentRequest
from .text_utils import chunk_text, count_tokens_approx, normalize_text


def compute_hash(content: str) -> str:
    return hashlib.sha256(content.encode('utf-8')).hexdigest()


def upsert_document(payload: IndexDocumentRequest) -> tuple[str, bool]:
    normalized = normalize_text(payload.content)
    content_hash = compute_hash(normalized)

    existing = fetch_one(
        """
        SELECT id, content_hash
        FROM knowledge_documents
        WHERE source_type = %s AND source_id = %s
        LIMIT 1
        """,
        (payload.source_type, payload.source_id),
    )

    with get_db() as conn:
        with conn.cursor() as cur:
            if payload.operation == 'delete':
                cur.execute(
                    """
                    DELETE FROM knowledge_documents
                    WHERE source_type = %s AND source_id = %s
                    RETURNING id
                    """,
                    (payload.source_type, payload.source_id),
                )
                row = cur.fetchone()
                return (str(row['id']) if row else ''), False

            if existing:
                if existing['content_hash'] == content_hash:
                    return str(existing['id']), True

                cur.execute(
                    """
                    UPDATE knowledge_documents
                    SET title = %s,
                        content = %s,
                        course_id = %s,
                        visibility = %s,
                        content_hash = %s,
                        updated_at = %s
                    WHERE id = %s
                    """,
                    (
                        payload.title,
                        normalized,
                        payload.course_id,
                        payload.visibility,
                        content_hash,
                        datetime.now(tz=timezone.utc),
                        existing['id'],
                    ),
                )
                return str(existing['id']), False

            cur.execute(
                """
                INSERT INTO knowledge_documents (
                    source_type,
                    source_id,
                    course_id,
                    title,
                    content,
                    visibility,
                    content_hash,
                    updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    payload.source_type,
                    payload.source_id,
                    payload.course_id,
                    payload.title,
                    normalized,
                    payload.visibility,
                    content_hash,
                    datetime.now(tz=timezone.utc),
                ),
            )
            inserted = cur.fetchone()
            return str(inserted['id']), False


def index_document(document_id: str, embedding_dim: int = 1536) -> int:
    row = fetch_one(
        """
        SELECT id, content, course_id, visibility
        FROM knowledge_documents
        WHERE id = %s
        LIMIT 1
        """,
        (document_id,),
    )
    if not row:
        return 0

    text = row['content'] or ''
    pieces = chunk_text(text, chunk_size_words=420, overlap_words=60)
    if not pieces:
        return 0

    embeddings = embed_texts(pieces)

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute('DELETE FROM knowledge_chunks WHERE document_id = %s', (document_id,))

            for idx, piece in enumerate(pieces):
                token_count = count_tokens_approx(piece)
                vector_literal = '[' + ','.join(f'{v:.8f}' for v in embeddings[idx]) + ']'
                cur.execute(
                    """
                    INSERT INTO knowledge_chunks (
                        document_id,
                        course_id,
                        visibility,
                        chunk_index,
                        chunk_text,
                        token_count,
                        embedding
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s::vector)
                    """,
                    (
                        document_id,
                        row['course_id'],
                        row['visibility'],
                        idx,
                        piece,
                        token_count,
                        vector_literal,
                    ),
                )

    return len(pieces)


def load_document_for_backfill(source_type: str, source_id: str, title: str, content: str, course_id: str | None, visibility: str) -> IndexDocumentRequest:
    return IndexDocumentRequest(
        source_type=source_type,
        source_id=source_id,
        title=title,
        content=content,
        course_id=course_id,
        visibility=visibility,
    )


def to_queue_job(document_id: str) -> str:
    return json.dumps({'document_id': document_id})


def purge_document_set(source_type: str, set_name: str) -> int:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM knowledge_documents
                WHERE source_type = %s
                  AND source_id LIKE %s
                """,
                (source_type, f"{set_name}:%"),
            )
            return int(cur.rowcount or 0)


def _slugify(value: str) -> str:
    normalized = value.lower().strip()
    normalized = re.sub(r"[^a-z0-9]+", "-", normalized)
    normalized = normalized.strip("-")
    return normalized[:64] if normalized else ""


def build_custom_qa_source_id(set_name: str, item: CustomQaItem, index: int) -> str:
    if item.id:
        return f"{set_name}:{item.id.strip()}"

    slug = _slugify(item.question)
    if slug:
        return f"{set_name}:{slug}"

    digest = hashlib.sha1(item.question.encode("utf-8")).hexdigest()[:12]
    return f"{set_name}:q{index:04d}-{digest}"


def build_custom_qa_content(item: CustomQaItem) -> str:
    lines = [
        f"Question: {item.question.strip()}",
        f"Answer: {item.answer.strip()}",
    ]

    if item.deep_link and item.deep_link.strip():
        lines.append(f"Deep link: {item.deep_link.strip()}")

    aliases = [alias.strip() for alias in item.aliases if alias.strip()]
    if aliases:
        lines.append(f"Aliases: {', '.join(aliases)}")

    tags = [tag.strip() for tag in item.tags if tag.strip()]
    if tags:
        lines.append(f"Tags: {', '.join(tags)}")

    if isinstance(item.notes, list):
        note_values = [note.strip() for note in item.notes if isinstance(note, str) and note.strip()]
        if note_values:
            lines.append(f"Notes: {' | '.join(note_values)}")
    elif isinstance(item.notes, str) and item.notes.strip():
        lines.append(f"Notes: {item.notes.strip()}")

    return "\n".join(lines)
