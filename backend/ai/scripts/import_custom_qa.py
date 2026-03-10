from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
from pathlib import Path
from typing import Any

import httpx
import psycopg


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import custom QA dataset into AI knowledge base.")
    parser.add_argument("--file", required=True, help="Path to JSON file (list of QA items or {'items': [...]})")
    parser.add_argument("--set-name", default="custom-qa", help="Stable dataset name used to build source_id")
    parser.add_argument("--source-type", default="custom_qa", help="knowledge_documents.source_type")
    parser.add_argument(
        "--visibility",
        default="public",
        choices=["public", "enrolled_only", "instructor_only", "admin_only"],
        help="Visibility for imported QA",
    )
    parser.add_argument("--course-id", default=None, help="Optional course_id for course-specific QA")
    parser.add_argument("--replace-set", action="store_true", help="Delete old docs in this set before import")
    parser.add_argument("--dry-run", action="store_true", help="Print payloads without sending requests")
    parser.add_argument("--ai-api-url", default=os.getenv("AI_API_URL", "http://localhost:8090"))
    parser.add_argument("--ai-internal-key", default=os.getenv("AI_INTERNAL_KEY", "change-me"))
    return parser.parse_args()


def load_items(file_path: Path) -> list[dict[str, Any]]:
    raw = json.loads(file_path.read_text(encoding="utf-8"))
    if isinstance(raw, dict):
        items = raw.get("items")
    else:
        items = raw

    if not isinstance(items, list):
        raise ValueError("JSON must be a list or an object with key 'items'.")

    cleaned: list[dict[str, Any]] = []
    for idx, item in enumerate(items, start=1):
        if not isinstance(item, dict):
            raise ValueError(f"Item #{idx} is not an object.")
        question = str(item.get("question", "")).strip()
        answer = str(item.get("answer", "")).strip()
        if not question or not answer:
            raise ValueError(f"Item #{idx} missing required fields: question/answer.")
        cleaned.append(item)
    return cleaned


def _slugify(value: str) -> str:
    normalized = value.lower().strip()
    normalized = re.sub(r"[^a-z0-9]+", "-", normalized)
    normalized = normalized.strip("-")
    return normalized[:64] if normalized else ""


def build_source_id(set_name: str, item: dict[str, Any], index: int) -> str:
    explicit_id = str(item.get("id", "")).strip()
    if explicit_id:
        return f"{set_name}:{explicit_id}"

    question = str(item.get("question", "")).strip()
    slug = _slugify(question)
    if slug:
        return f"{set_name}:{slug}"

    digest = hashlib.sha1(question.encode("utf-8")).hexdigest()[:12]
    return f"{set_name}:q{index:04d}-{digest}"


def build_content(item: dict[str, Any]) -> str:
    question = str(item["question"]).strip()
    answer = str(item["answer"]).strip()

    lines = [
        f"Question: {question}",
        f"Answer: {answer}",
    ]

    deep_link = str(item.get("deep_link", "")).strip()
    if deep_link:
        lines.append(f"Deep link: {deep_link}")

    aliases = item.get("aliases")
    if isinstance(aliases, list) and aliases:
        lines.append("Aliases: " + ", ".join(str(alias).strip() for alias in aliases if str(alias).strip()))

    tags = item.get("tags")
    if isinstance(tags, list) and tags:
        lines.append("Tags: " + ", ".join(str(tag).strip() for tag in tags if str(tag).strip()))

    notes = item.get("notes")
    if isinstance(notes, list):
        note_values = [str(note).strip() for note in notes if str(note).strip()]
        if note_values:
            lines.append("Notes: " + " | ".join(note_values))
    elif notes is not None and str(notes).strip():
        lines.append(f"Notes: {str(notes).strip()}")

    return "\n".join(lines)


def _pg_dsn() -> str:
    host = os.getenv("PG_HOST", "database")
    port = os.getenv("PG_PORT", "5432")
    db = os.getenv("PG_DB", "elearning")
    user = os.getenv("PG_USER", "directus")
    password = os.getenv("PG_PASSWORD", "")
    return f"postgresql://{user}:{password}@{host}:{port}/{db}"


def purge_set(source_type: str, set_name: str) -> int:
    dsn = _pg_dsn()
    with psycopg.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM knowledge_documents
                WHERE source_type = %s
                  AND source_id LIKE %s
                """,
                (source_type, f"{set_name}:%"),
            )
            deleted = cur.rowcount
    return int(deleted or 0)


def main() -> None:
    args = parse_args()
    file_path = Path(args.file)
    if not file_path.exists():
        raise FileNotFoundError(f"Input file not found: {file_path}")

    items = load_items(file_path)
    headers = {"X-AI-Internal-Key": args.ai_internal_key}

    if args.replace_set:
        deleted = purge_set(args.source_type, args.set_name)
        print(f"[replace-set] deleted {deleted} existing docs from set '{args.set_name}'")

    upserted = 0
    with httpx.Client(timeout=30.0) as client:
        for index, item in enumerate(items, start=1):
            source_id = build_source_id(args.set_name, item, index)
            question = str(item["question"]).strip()
            payload = {
                "source_type": args.source_type,
                "source_id": source_id,
                "title": question,
                "content": build_content(item),
                "visibility": args.visibility,
                "course_id": args.course_id,
                "operation": "upsert",
            }

            if args.dry_run:
                print(json.dumps(payload, ensure_ascii=False))
                continue

            response = client.post(f"{args.ai_api_url}/v1/index/document", json=payload, headers=headers)
            response.raise_for_status()
            upserted += 1
            print(f"[upserted] {source_id}")

    if args.dry_run:
        print(f"[dry-run] total items: {len(items)}")
        return

    print(f"Done. Imported {upserted} QA items from {file_path}.")


if __name__ == "__main__":
    main()

