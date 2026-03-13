from __future__ import annotations

import hashlib
import json
import re
import time
import unicodedata
from difflib import SequenceMatcher
from datetime import datetime, timezone
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from pydantic import ValidationError

from .config import get_settings
from .db import fetch_all
from .llm import generate_json, parse_json_str, repair_json
from .models import (
    AssignmentOutput,
    AssistantClarifyPayload,
    HelpdeskOutput,
    MentorOutput,
    ReferencesOutput,
)
from .policy import should_block_assignment
from .prompts import (
    ASSIGNMENT_SYSTEM_PROMPT,
    HELPDESK_FEW_SHOT,
    HELPDESK_SYSTEM_PROMPT,
    MENTOR_SYSTEM_PROMPT,
    REFERENCES_FEW_SHOT,
    REFERENCES_SYSTEM_PROMPT,
)
from .redis_client import get_redis
from .retrieval import format_context, retrieve_chunks
from .store import list_feedback_training_examples, log_policy_violation

_STYLE_EXAMPLE_CACHE: dict[str, tuple[float, list[dict[str, Any]]]] = {}
_STRICT_QA_CACHE: dict[str, tuple[float, list[dict[str, Any]]]] = {}
_CONTENT_LABEL_PATTERN = r"(?:Question|Answer|Course|Category|Level|Description|Deep link|Topics|Modules|Lessons|Quizzes|Aliases|Tags|Notes)"
_REFERENCE_SOURCE_TYPES = ("references", "course_module", "course_lesson", "quiz")
_ASSISTANT_SUPPORT_SIGNALS: tuple[tuple[str, float], ...] = (
    ("quen mat khau", 2.6),
    ("khong dang nhap", 2.6),
    ("dang nhap", 1.7),
    ("mat khau", 1.7),
    ("tai khoan", 1.4),
    ("khong vao duoc", 2.4),
    ("khong mo duoc", 2.2),
    ("khong xem duoc", 2.2),
    ("khong nghe duoc", 2.0),
    ("khong the", 1.6),
    ("thanh toan", 1.8),
    ("hoa don", 1.8),
    ("chung chi", 1.7),
    ("duyet giang vien", 2.1),
    ("giang vien", 1.2),
    ("loi", 1.8),
    ("su co", 1.8),
    ("bug", 1.8),
    ("ho tro", 1.6),
)
_ASSISTANT_LEARNING_SIGNALS: tuple[tuple[str, float], ...] = (
    ("tai lieu", 2.4),
    ("tham khao", 2.2),
    ("chu de", 2.0),
    ("lo trinh", 2.0),
    ("hoc", 1.0),
    ("khoa hoc", 1.2),
    ("module", 1.4),
    ("lesson", 1.4),
    ("bai hoc", 1.2),
    ("video", 1.1),
    ("quiz", 1.0),
    ("kien thuc", 1.6),
    ("tim hieu", 1.6),
    ("goi y", 1.2),
    ("react", 1.0),
    ("figma", 1.0),
    ("playwright", 1.0),
)
_ASSISTANT_SYSTEM_TERMS = (
    "dang nhap",
    "mat khau",
    "tai khoan",
    "thanh toan",
    "hoa don",
    "bai hoc",
    "video",
    "khoa hoc",
    "chung chi",
    "giang vien",
)
_ASSISTANT_ISSUE_TERMS = ("khong", "loi", "bug", "bi", "quen", "sao", "khong the", "khong vao", "khong xem")


def clear_runtime_caches() -> None:
    _STRICT_QA_CACHE.clear()


def _normalize_query(value: str) -> str:
    return " ".join(value.lower().split())


def _normalize_for_match(value: str) -> str:
    # Handle Vietnamese-specific letter đ/Đ before ASCII folding so "đâu" matches "dau".
    prepared = value.replace("đ", "d").replace("Đ", "D")
    base = unicodedata.normalize("NFKD", prepared).encode("ascii", "ignore").decode("ascii").lower()
    base = re.sub(r"[^a-z0-9]+", " ", base)
    return _normalize_query(base)


def _extract_field_by_label(text: str, label: str) -> str:
    escaped_label = re.escape(label)
    match = re.search(
        rf"{escaped_label}:\s*(.*?)(?=(?:\s+{_CONTENT_LABEL_PATTERN}:)|$)",
        text.strip(),
        flags=re.IGNORECASE,
    )
    return match.group(1).strip() if match else ""


def _parse_aliases(text: str) -> list[str]:
    raw = _extract_field_by_label(text, "Aliases")
    if not raw:
        return []
    return [item.strip() for item in raw.split(",") if item.strip()]


def _strict_qa_cache_key(
    role: str,
    course_id: str | None,
    source_types: tuple[str, ...] | None,
) -> str:
    source_part = ",".join(source_types or ())
    return f"{role}:{course_id or ''}:{source_part}"


def _strict_qa_visibility_for_role(role: str) -> tuple[str, ...]:
    role_lower = role.lower()
    if role_lower == "admin":
        return ("public", "enrolled_only", "instructor_only", "admin_only")
    if role_lower == "instructor":
        return ("public", "enrolled_only", "instructor_only")
    return ("public", "enrolled_only")


def _load_strict_qa_entries(
    role: str,
    course_id: str | None,
    source_types: tuple[str, ...] | None,
) -> list[dict[str, Any]]:
    settings = get_settings()
    ttl = max(1, settings.strict_qa_lookup_ttl_sec)
    cache_key = _strict_qa_cache_key(role, course_id, source_types)
    now = time.time()
    cached = _STRICT_QA_CACHE.get(cache_key)
    if cached and (now - cached[0]) < ttl:
        return list(cached[1])

    visibilities = _strict_qa_visibility_for_role(role)
    if source_types:
        if course_id:
            rows = fetch_all(
                """
                SELECT id, source_id, source_type, title, content, course_id, visibility
                FROM knowledge_documents
                WHERE source_type = ANY(%s)
                  AND visibility = ANY(%s)
                  AND (course_id = %s OR course_id IS NULL)
                """,
                (list(source_types), list(visibilities), course_id),
            )
        else:
            rows = fetch_all(
                """
                SELECT id, source_id, source_type, title, content, course_id, visibility
                FROM knowledge_documents
                WHERE source_type = ANY(%s)
                  AND visibility = ANY(%s)
                """,
                (list(source_types), list(visibilities)),
            )
    else:
        if course_id:
            rows = fetch_all(
                """
                SELECT id, source_id, source_type, title, content, course_id, visibility
                FROM knowledge_documents
                WHERE visibility = ANY(%s)
                  AND (course_id = %s OR course_id IS NULL)
                """,
                (list(visibilities), course_id),
            )
        else:
            rows = fetch_all(
                """
                SELECT id, source_id, source_type, title, content, course_id, visibility
                FROM knowledge_documents
                WHERE visibility = ANY(%s)
                """,
                (list(visibilities),),
            )

    parsed_entries: list[dict[str, Any]] = []
    for row in rows:
        content = str(row.get("content") or "")
        question = _extract_field_by_label(content, "Question") or str(row.get("title") or "").strip()
        answer = _extract_field_by_label(content, "Answer") or content.strip()
        deep_link = _extract_field_by_label(content, "Deep link") or "/help"
        aliases = _parse_aliases(content)
        candidates = [question] + aliases
        candidate_norms = [_normalize_for_match(item) for item in candidates if item.strip()]
        parsed_entries.append(
            {
                "id": str(row.get("id") or ""),
                "document_id": str(row.get("id") or ""),
                "question": question,
                "answer": answer,
                "deep_link": deep_link,
                "aliases": aliases,
                "candidate_norms": candidate_norms,
                "source_type": str(row.get("source_type") or ""),
                "source_id": str(row.get("source_id") or ""),
                "course_id": row.get("course_id"),
                "visibility": str(row.get("visibility") or ""),
            }
        )

    _STRICT_QA_CACHE[cache_key] = (now, parsed_entries)
    return list(parsed_entries)


def _score_query_against_candidate(query_norm: str, candidate_norm: str) -> float:
    if not candidate_norm:
        return 0.0
    if query_norm == candidate_norm:
        return 1.0
    return 0.0


def _strict_qa_lookup(
    query: str,
    role: str,
    course_id: str | None,
    source_types: tuple[str, ...] | None,
) -> tuple[dict[str, Any] | None, float]:
    entries = _load_strict_qa_entries(role=role, course_id=course_id, source_types=source_types)
    if not entries:
        return None, 0.0

    query_norm = _normalize_for_match(query)
    best_score = 0.0
    best_entry: dict[str, Any] | None = None

    for entry in entries:
        for candidate_norm in entry.get("candidate_norms", []):
            score = _score_query_against_candidate(query_norm, candidate_norm)
            if score > best_score:
                best_score = score
                best_entry = entry

    return best_entry, best_score


def _response_cache_key(
    mode: str,
    role: str,
    query: str,
    course_id: str | None,
    variant: str | None = None,
) -> str:
    raw = f"{mode}:{role}:{_normalize_query(query)}:{course_id or ''}:{variant or ''}"
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return f"ai:response:{mode}:{digest}"


def _get_cached_response(
    mode: str,
    role: str,
    query: str,
    course_id: str | None,
    variant: str | None = None,
) -> dict[str, Any] | None:
    redis = get_redis()
    key = _response_cache_key(mode, role, query, course_id, variant)
    cached = redis.get(key)
    if not cached:
        return None
    try:
        payload = json.loads(cached)
        if isinstance(payload, dict):
            return payload
    except json.JSONDecodeError:
        return None
    return None


def _set_cached_response(
    mode: str,
    role: str,
    query: str,
    course_id: str | None,
    output: dict[str, Any],
    variant: str | None = None,
) -> None:
    settings = get_settings()
    if settings.response_cache_ttl_sec <= 0:
        return
    redis = get_redis()
    key = _response_cache_key(mode, role, query, course_id, variant)
    redis.setex(key, settings.response_cache_ttl_sec, json.dumps(output, ensure_ascii=False))


def _dynamic_style_examples(mode: str) -> list[dict[str, Any]]:
    settings = get_settings()
    ttl = max(1, settings.style_examples_cache_ttl_sec)
    now = time.time()
    cached = _STYLE_EXAMPLE_CACHE.get(mode)
    if cached and (now - cached[0]) < ttl:
        return list(cached[1])

    rows: list[dict[str, Any]] = []
    dynamic_rows = list_feedback_training_examples(mode=mode, limit=settings.feedback_style_example_limit)
    for item in dynamic_rows:
        try:
            parsed = json.loads(str(item.get("assistant_content", "")))
        except json.JSONDecodeError:
            continue
        if not isinstance(parsed, dict) or parsed.get("mode") != mode:
            continue
        parsed.pop("fallback_used", None)
        parsed.pop("retrieved_count", None)
        parsed.pop("cache_hit", None)
        rows.append(parsed)

    _STYLE_EXAMPLE_CACHE[mode] = (now, rows)
    return list(rows)


def _build_style_examples(mode: str, static_example: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    if static_example:
        rows.append(static_example)

    rows.extend(_dynamic_style_examples(mode))
    return rows


def _strict_mode_config(mode: str) -> tuple[bool, tuple[str, ...] | None, float | None]:
    settings = get_settings()
    enabled = settings.strict_qa_only and mode.lower() in settings.strict_qa_modes_set
    if not enabled:
        return False, None, None

    source_types = settings.strict_qa_source_types_set or ('faq',)
    return True, source_types, settings.strict_qa_max_distance


def _suggestion_score(query_norm: str, candidate_norm: str) -> float:
    if not query_norm or not candidate_norm:
        return 0.0
    if query_norm == candidate_norm:
        return 1.0
    if candidate_norm.startswith(query_norm):
        return 0.97
    if query_norm in candidate_norm:
        return 0.94
    if candidate_norm in query_norm:
        return 0.9

    query_tokens = set(query_norm.split())
    candidate_tokens = set(candidate_norm.split())
    if not query_tokens or not candidate_tokens:
        return 0.0

    overlap = len(query_tokens & candidate_tokens) / max(len(query_tokens), 1)
    ratio = SequenceMatcher(None, query_norm, candidate_norm).ratio()
    return max(overlap * 0.85, ratio * 0.75)


def list_helpdesk_suggestions(
    role: str,
    course_id: str | None,
    source_types: tuple[str, ...] | None,
    query: str = "",
    limit: int = 8,
) -> list[dict[str, str]]:
    safe_limit = min(max(int(limit), 1), 25)
    entries = _load_strict_qa_entries(role=role, course_id=course_id, source_types=source_types)
    query_norm = _normalize_for_match(query)

    ranked: list[tuple[float, dict[str, Any]]] = []
    for entry in entries:
        candidates = entry.get("candidate_norms", [])
        if not isinstance(candidates, list):
            continue
        score = max((_suggestion_score(query_norm, item) for item in candidates), default=0.0)
        if query_norm and score <= 0:
            continue
        ranked.append((score, entry))

    if not ranked:
        ranked = [(0.0, entry) for entry in entries]

    ranked.sort(
        key=lambda item: (
            item[0],
            len(str(item[1].get("question") or "")),
            str(item[1].get("question") or "").lower(),
        ),
        reverse=True,
    )

    suggestions: list[dict[str, str]] = []
    seen_questions: set[str] = set()
    for _, entry in ranked:
        question = str(entry.get("question") or "").strip()
        if not question:
            continue
        question_norm = _normalize_for_match(question)
        if question_norm in seen_questions:
            continue
        seen_questions.add(question_norm)
        suggestions.append(
            {
                "question": question,
                "deep_link": str(entry.get("deep_link") or "/help"),
            }
        )
        if len(suggestions) >= safe_limit:
            break

    return suggestions


def _reference_suggestion_candidates(row: dict[str, Any]) -> list[str]:
    title = str(row.get("title") or "").strip()
    content = str(row.get("content") or "")
    candidates = [title]

    for label in ("Course", "Category", "Topics", "Modules", "Lessons"):
        raw = _extract_field_by_label(content, label)
        if not raw:
            continue
        for item in re.split(r"[|,;]", raw):
            normalized = item.strip()
            if normalized:
                candidates.append(normalized)

    deduped: list[str] = []
    seen: set[str] = set()
    for item in candidates:
        key = _normalize_for_match(item)
        if not key or key in seen:
            continue
        seen.add(key)
        deduped.append(item)
    return deduped


def _reference_catalog_rows() -> list[dict[str, Any]]:
    return fetch_all(
        """
        SELECT id, title, content, source_type, source_id
        FROM knowledge_documents
        WHERE source_type = 'references'
          AND visibility = 'public'
        ORDER BY updated_at DESC
        """
    )


def _build_reference_search_query(title: str, course_title: str) -> str:
    normalized_title = _normalize_for_match(title)
    normalized_course = _normalize_for_match(course_title)
    if title and course_title and normalized_title and normalized_title != normalized_course:
        return f"{title} {course_title}".strip()
    return title.strip()


def _reference_entry_candidates(entry: dict[str, str]) -> list[str]:
    candidates = [
        str(entry.get("title") or "").strip(),
        str(entry.get("search_query") or "").strip(),
        str(entry.get("course_title") or "").strip(),
        str(entry.get("category") or "").strip(),
        str(entry.get("level") or "").strip(),
    ]

    deduped: list[str] = []
    seen: set[str] = set()
    for item in candidates:
        normalized = _normalize_for_match(item)
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        deduped.append(item)
    return deduped


def _reference_entry_score(query_norm: str, entry: dict[str, str]) -> float:
    if not query_norm:
        return 0.0
    return max(
        (_suggestion_score(query_norm, _normalize_for_match(candidate)) for candidate in _reference_entry_candidates(entry)),
        default=0.0,
    )


def _decorate_ai_reference_url(url: str) -> str:
    safe = str(url or "").strip()
    if not safe or safe.startswith(("http://", "https://")):
        return safe

    parts = urlsplit(safe)
    query_items = dict(parse_qsl(parts.query, keep_blank_values=True))
    query_items.setdefault("from", "ai-references")

    return urlunsplit(
        (
            parts.scheme,
            parts.netloc,
            parts.path,
            urlencode(query_items),
            parts.fragment,
        )
    )


def _normalize_reference_source_type(value: str | None) -> str | None:
    normalized = str(value or "").strip().lower()
    if normalized in {"references", "course_module", "course_lesson", "quiz"}:
        return normalized
    return None


def _infer_reference_source_type_from_url(url: str) -> str | None:
    safe = str(url or "").strip().lower()
    if not safe:
        return None
    if "/learn/" in safe:
        return "course_lesson"
    if "module=" in safe or "#module-" in safe:
        return "course_module"
    if "quiz" in safe:
        return "quiz"
    if "/courses/" in safe:
        return "references"
    return None


def _extract_linked_entries(
    text: str,
    label: str,
    source_type: str,
    *,
    course_title: str,
    course_url: str,
    category: str,
    level: str,
) -> list[dict[str, str]]:
    raw = _extract_field_by_label(text, label)
    if not raw:
        return []

    entries: list[dict[str, str]] = []
    for item in raw.split("|"):
        left, separator, right = item.partition("=>")
        title = left.strip()
        url = right.strip() if separator else ""
        if not title:
            continue
        entries.append(
            {
                "title": title,
                "source_type": source_type,
                "url": _decorate_ai_reference_url(url),
                "search_query": _build_reference_search_query(title, course_title),
                "course_title": course_title,
                "course_url": course_url,
                "category": category,
                "level": level,
            }
        )
    return entries


def _reference_suggestion_entries(row: dict[str, Any]) -> list[dict[str, str]]:
    content = str(row.get("content") or "")
    course_title = str(row.get("title") or "").strip()
    course_url = _reference_row_url(row)
    category = _extract_field_by_label(content, "Category")
    level = _extract_field_by_label(content, "Level")
    entries = [
        {
            "title": course_title,
            "source_type": "references",
            "url": course_url,
            "search_query": _build_reference_search_query(course_title, course_title),
            "course_title": course_title,
            "course_url": course_url,
            "category": category,
            "level": level,
        }
    ]
    entries.extend(
        _extract_linked_entries(
            content,
            "Module links",
            "course_module",
            course_title=course_title,
            course_url=course_url,
            category=category,
            level=level,
        )
    )
    entries.extend(
        _extract_linked_entries(
            content,
            "Lesson links",
            "course_lesson",
            course_title=course_title,
            course_url=course_url,
            category=category,
            level=level,
        )
    )
    return [entry for entry in entries if entry.get("title")]


def _reference_row_url(row: dict[str, Any]) -> str:
    content = str(row.get("content") or "")
    deep_link = _extract_field_by_label(content, "Deep link")
    if deep_link:
        return _decorate_ai_reference_url(deep_link)
    source_id = str(row.get("source_id") or "").strip()
    if source_id.startswith(("http://", "https://", "/")):
        return _decorate_ai_reference_url(source_id)
    return ""


def list_reference_suggestions(
    query: str = "",
    limit: int = 8,
) -> list[dict[str, str]]:
    safe_limit = min(max(int(limit), 1), 25)
    rows = _reference_catalog_rows()
    query_norm = _normalize_for_match(query)

    ranked: list[tuple[float, str, str]] = []
    for row in rows:
        for entry in _reference_suggestion_entries(row):
            score = _reference_entry_score(query_norm, entry) if query_norm else 0.0
            if query_norm and score <= 0:
                continue
            ranked.append((score, json.dumps(entry, ensure_ascii=False), entry["title"]))

    ranked.sort(key=lambda item: (item[0], -len(item[2]), item[2].lower()), reverse=True)

    suggestions: list[dict[str, str]] = []
    seen_keys: set[str] = set()
    for _, payload, _ in ranked:
        entry = json.loads(payload)
        title = str(entry.get("title") or "").strip()
        source_type = str(entry.get("source_type") or "").strip()
        url = str(entry.get("url") or "").strip()
        course_title = str(entry.get("course_title") or "").strip()
        entry_key = f"{source_type}:{_normalize_for_match(title)}:{_normalize_for_match(course_title)}"
        if not title or not source_type or entry_key in seen_keys:
            continue
        seen_keys.add(entry_key)
        suggestions.append(
            {
                "title": title,
                "source_type": source_type,
                "url": url,
                "search_query": str(entry.get("search_query") or title),
                "course_title": course_title,
                "course_url": str(entry.get("course_url") or ""),
                "category": str(entry.get("category") or ""),
                "level": str(entry.get("level") or ""),
            }
        )
        if len(suggestions) >= safe_limit:
            break

    return suggestions


def _assistant_signal_score(query_norm: str, weighted_phrases: tuple[tuple[str, float], ...]) -> float:
    score = 0.0
    for phrase, weight in weighted_phrases:
        if phrase in query_norm:
            score += weight
    return score


def _assistant_support_score(query_norm: str) -> float:
    score = _assistant_signal_score(query_norm, _ASSISTANT_SUPPORT_SIGNALS)
    has_system_term = any(term in query_norm for term in _ASSISTANT_SYSTEM_TERMS)
    has_issue_term = any(term in query_norm for term in _ASSISTANT_ISSUE_TERMS)
    if has_system_term and has_issue_term:
        score += 1.4
    if has_system_term and any(phrase in query_norm for phrase in ("lam sao", "o dau", "cach", "sao toi")):
        score += 0.8
    return score


def _assistant_learning_score(query_norm: str) -> float:
    score = _assistant_signal_score(query_norm, _ASSISTANT_LEARNING_SIGNALS)
    if any(phrase in query_norm for phrase in ("muon hoc", "tim tai lieu", "goi y tai lieu", "chu de")):
        score += 0.8
    return score


def _assistant_reference_query(query: str) -> str:
    normalized = _normalize_for_match(query)
    cleaned = normalized
    removable_phrases = (
        "toi muon",
        "toi can",
        "toi dang tim",
        "giu p toi",
        "giup toi",
        "goi y",
        "goi y tai lieu",
        "tim tai lieu",
        "tham khao",
        "tai lieu",
        "chu de",
        "ve",
        "de hoc",
        "muon hoc",
        "muon tim",
        "tim hieu",
    )
    for phrase in removable_phrases:
        cleaned = re.sub(rf"\b{re.escape(phrase)}\b", " ", cleaned)

    cleaned = _normalize_query(cleaned)
    if len(cleaned) >= 3:
        original_matches = search_reference_catalog(query, limit=1)
        original_score = float(original_matches[0].get("catalog_score") or 0.0) if original_matches else 0.0
        cleaned_matches = search_reference_catalog(cleaned, limit=1)
        cleaned_score = float(cleaned_matches[0].get("catalog_score") or 0.0) if cleaned_matches else 0.0
        if cleaned_score >= max(0.82, original_score):
            return cleaned

    return query


def _resolve_assistant_mode(
    query: str,
    role: str,
    course_id: str | None,
) -> tuple[str | None, str]:
    query_norm = _normalize_for_match(query)
    if not query_norm:
        return None, "clarify_needed"

    settings = get_settings()
    source_types = settings.strict_qa_source_types_set or ("custom_qa", "faq")
    helpdesk_entry, helpdesk_score = _strict_qa_lookup(
        query=query,
        role=role,
        course_id=course_id,
        source_types=source_types,
    )
    catalog_matches = search_reference_catalog(query, limit=1)
    catalog_score = float(catalog_matches[0].get("catalog_score") or 0.0) if catalog_matches else 0.0
    support_score = _assistant_support_score(query_norm)
    learning_score = _assistant_learning_score(query_norm)

    if helpdesk_entry is not None and helpdesk_score >= 1.0:
        return "helpdesk", "helpdesk_exact_qa"

    if support_score >= 2.2 and support_score >= learning_score + 0.6:
        return "helpdesk", "support_keyword"

    if catalog_score >= 0.92 and support_score < 1.6:
        return "references", "reference_catalog_hit"

    if helpdesk_entry is not None and helpdesk_score >= 0.94 and helpdesk_score >= catalog_score + 0.08:
        return "helpdesk", "helpdesk_near_match"

    if learning_score >= 1.6 and learning_score >= support_score + 0.3:
        return "references", "learning_keyword"

    if support_score >= 1.6 and helpdesk_score >= 0.7:
        return "helpdesk", "support_plus_qa"

    if catalog_score >= 0.82 and catalog_score >= helpdesk_score + 0.05 and support_score < 2.0:
        return "references", "reference_catalog_match"

    if catalog_score >= 0.65 and support_score == 0:
        return "references", "reference_catalog_soft_match"

    return None, "clarify_needed"


def _assistant_clarify_output(requested_mode: str) -> dict[str, Any]:
    clarify = AssistantClarifyPayload(
        question="Bạn cần AI hỗ trợ thao tác hệ thống hay gợi ý tài liệu học trong dự án?",
        options=[
            {"label": "Hỗ trợ hệ thống", "value": "helpdesk"},
            {"label": "Tìm tài liệu", "value": "references"},
        ],
    )
    return {
        "kind": "clarify",
        "requested_mode": requested_mode,
        "resolved_mode": None,
        "route_reason": "clarify_needed",
        "data": clarify.model_dump(mode="json"),
    }


def _reference_suggestion_description(item: dict[str, str]) -> str:
    parts: list[str] = []
    source_type = str(item.get("source_type") or "").strip().lower()
    course_title = str(item.get("course_title") or "").strip()
    category = str(item.get("category") or "").strip()
    level = str(item.get("level") or "").strip()

    if source_type != "references" and course_title:
        parts.append(course_title)
    if category:
        parts.append(category)
    if level:
        parts.append(level)

    return " | ".join(parts)


def list_assistant_suggestions(
    *,
    role: str,
    course_id: str | None,
    query: str = "",
    requested_mode: str = "auto",
    limit: int = 8,
) -> list[dict[str, Any]]:
    safe_limit = min(max(int(limit), 1), 25)
    normalized_mode = requested_mode if requested_mode in {"auto", "helpdesk", "references"} else "auto"
    settings = get_settings()
    helpdesk_source_types = settings.strict_qa_source_types_set or ("custom_qa", "faq")

    helpdesk_items: list[dict[str, Any]] = []
    reference_items: list[dict[str, Any]] = []

    if normalized_mode in {"auto", "helpdesk"}:
        helpdesk_items = [
            {
                "kind": "helpdesk",
                "title": str(item.get("question") or "").strip(),
                "description": "Câu hỏi hỗ trợ thao tác và xử lý sự cố trong hệ thống.",
                "url": str(item.get("deep_link") or "/help"),
                "search_query": str(item.get("question") or "").strip(),
                "source_type": None,
                "course_title": "",
                "course_url": "",
                "category": "",
                "level": "",
            }
            for item in list_helpdesk_suggestions(
                role=role,
                course_id=course_id,
                source_types=helpdesk_source_types,
                query=query,
                limit=safe_limit,
            )
        ]

    if normalized_mode in {"auto", "references"}:
        reference_items = [
            {
                "kind": "references",
                "title": str(item.get("title") or "").strip(),
                "description": _reference_suggestion_description(item),
                "url": str(item.get("url") or "").strip(),
                "search_query": str(item.get("search_query") or item.get("title") or "").strip(),
                "source_type": _normalize_reference_source_type(str(item.get("source_type") or "")),
                "course_title": str(item.get("course_title") or "").strip(),
                "course_url": str(item.get("course_url") or "").strip(),
                "category": str(item.get("category") or "").strip(),
                "level": str(item.get("level") or "").strip(),
            }
            for item in list_reference_suggestions(query=query, limit=safe_limit)
        ]

    if normalized_mode == "helpdesk":
        return helpdesk_items[:safe_limit]
    if normalized_mode == "references":
        return reference_items[:safe_limit]

    suggested_mode, _ = _resolve_assistant_mode(query, role, course_id) if query.strip() else ("references", "default_references")
    primary = reference_items if suggested_mode != "helpdesk" else helpdesk_items
    secondary = helpdesk_items if suggested_mode != "helpdesk" else reference_items

    merged: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in [*primary, *secondary]:
        key = ":".join(
            [
                str(item.get("kind") or ""),
                _normalize_for_match(str(item.get("title") or "")),
                _normalize_for_match(str(item.get("course_title") or "")),
            ]
        )
        if not str(item.get("title") or "").strip() or key in seen:
            continue
        seen.add(key)
        merged.append(item)
        if len(merged) >= safe_limit:
            break

    return merged


def search_reference_catalog(query: str, limit: int = 4) -> list[dict[str, Any]]:
    query_norm = _normalize_for_match(query)
    if not query_norm:
        return []

    ranked: list[tuple[float, dict[str, Any]]] = []
    for row in _reference_catalog_rows():
        for entry in _reference_suggestion_entries(row):
            score = _reference_entry_score(query_norm, entry)
            if score <= 0:
                continue
            ranked.append(
                (
                    score,
                    row
                    | {
                        "matched_title": entry["title"],
                        "matched_source_type": entry["source_type"],
                        "matched_url": entry["url"],
                        "matched_search_query": entry["search_query"],
                        "matched_course_title": entry["course_title"],
                    },
                )
            )

    ranked.sort(
        key=lambda item: (
            item[0],
            len(str(item[1].get("title") or "")),
            str(item[1].get("title") or "").lower(),
        ),
        reverse=True,
    )

    matches: list[dict[str, Any]] = []
    top_score = ranked[0][0] if ranked else 0.0
    min_score = max(0.7, top_score - 0.08)

    for score, row in ranked:
        if score < min_score:
            continue
        matches.append(
            {
                "id": str(row.get("id") or ""),
                "document_id": str(row.get("id") or ""),
                "document_title": str(row.get("matched_title") or row.get("title") or ""),
                "chunk_text": str(row.get("content") or ""),
                "source_type": str(row.get("matched_source_type") or "references"),
                "source_id": str(row.get("matched_url") or row.get("source_id") or ""),
                "course_id": None,
                "catalog_score": round(score, 4),
            }
        )
        if len(matches) >= max(limit, 1):
            break
    return matches


def _strict_helpdesk_refusal(query: str, suggested_questions: list[dict[str, str]] | None = None) -> dict[str, Any]:
    message = get_settings().strict_qa_refuse_message
    return HelpdeskOutput(
        mode="helpdesk",
        answer_title="Xin lỗi, tôi chưa thể trả lời câu hỏi này",
        steps=[
            {
                "title": "Câu hỏi ngoài phạm vi hỗ trợ",
                "detail": "Hệ thống hiện chỉ trả lời theo bộ câu hỏi đã được cấu hình trước.",
                "deep_link": "/help",
            }
        ],
        common_issues=[
            {
                "symptom": f"Không tìm thấy câu hỏi phù hợp với nội dung: {query}",
                "cause": "Hệ thống đang bật chế độ chỉ trả lời từ bộ QA đã phê duyệt",
                "fix": message,
            }
        ],
        suggested_questions=suggested_questions or [],
    ).model_dump(mode="json")


def _strict_references_refusal(query: str) -> dict[str, Any]:
    message = get_settings().strict_qa_refuse_message
    return ReferencesOutput(
        mode="references",
        topic=query,
        recommendations=[],
        notes=[
            "Xin lỗi, tôi chưa thể trả lời câu hỏi này vì nằm ngoài bộ QA đã cấu hình.",
            message,
        ],
    ).model_dump(mode="json")


def _tokenize_for_scope(text: str) -> set[str]:
    return {token for token in re.findall(r"[^\W_]+", text.lower()) if len(token) >= 2}


def _extract_question_like_text(chunk: dict[str, Any]) -> str:
    text = str(chunk.get("chunk_text", ""))
    for line in text.splitlines():
        normalized = line.strip()
        if normalized.lower().startswith("question:"):
            question_part = normalized.split(":", 1)[1].strip()
            answer_idx = question_part.lower().find(" answer:")
            if answer_idx >= 0:
                question_part = question_part[:answer_idx].strip()
            return question_part
    title = str(chunk.get("document_title", "")).strip()
    if title:
        return title
    return text


def _strict_best_match(query: str, chunks: list[dict[str, Any]]) -> tuple[float, dict[str, Any] | None]:
    query_tokens = _tokenize_for_scope(query)
    if not query_tokens:
        return 0.0, None

    best = 0.0
    best_chunk: dict[str, Any] | None = None
    for chunk in chunks:
        candidate_tokens = _tokenize_for_scope(_extract_question_like_text(chunk))
        if not candidate_tokens:
            continue
        overlap = len(query_tokens & candidate_tokens) / len(query_tokens)
        if overlap > best:
            best = overlap
            best_chunk = chunk
    return best, best_chunk


def _extract_qa_from_chunk(chunk: dict[str, Any]) -> dict[str, str]:
    text = str(chunk.get("chunk_text", ""))
    question = ""
    answer = ""
    deep_link = ""

    match_question = re.search(r"Question:\s*(.*?)(?:\s+Answer:|$)", text, flags=re.IGNORECASE)
    if match_question:
        question = match_question.group(1).strip()

    match_answer = re.search(
        r"Answer:\s*(.*?)(?:\s+Deep link:|\s+Aliases:|\s+Tags:|\s+Notes:|$)",
        text,
        flags=re.IGNORECASE,
    )
    if match_answer:
        answer = match_answer.group(1).strip()

    match_deep_link = re.search(r"Deep link:\s*([^\s]+)", text, flags=re.IGNORECASE)
    if match_deep_link:
        deep_link = match_deep_link.group(1).strip()

    return {"question": question, "answer": answer, "deep_link": deep_link}


def _build_strict_helpdesk_answer(query: str, chunk: dict[str, Any]) -> dict[str, Any]:
    qa = _extract_qa_from_chunk(chunk)
    question_raw = (
        str(chunk.get("question") or "").strip()
        or qa.get("question")
        or _extract_question_like_text(chunk)
        or query
    )
    answer_raw = str(chunk.get("answer") or "").strip() or qa.get("answer") or str(chunk.get("chunk_text", "")).strip()
    deep_link = str(chunk.get("deep_link") or "").strip() or qa.get("deep_link") or "/help"
    source_id = str(chunk.get("document_id") or chunk.get("id") or "")

    question = question_raw
    answer = answer_raw

    return HelpdeskOutput(
        mode="helpdesk",
        answer_title=question,
        steps=[
            {
                "title": "Thong tin tu bo QA da phe duyet",
                "detail": answer,
                "deep_link": deep_link,
            }
        ],
        common_issues=[],
    ).model_dump(mode="json") | {"source_ids": [source_id] if source_id else []}


def _build_strict_references_answer(query: str, chunk: dict[str, Any]) -> dict[str, Any]:
    qa = _extract_qa_from_chunk(chunk)
    title_raw = (
        str(chunk.get("question") or "").strip()
        or qa.get("question")
        or _extract_question_like_text(chunk)
        or query
    )
    reason_raw = str(chunk.get("answer") or "").strip() or qa.get("answer") or str(chunk.get("chunk_text", "")).strip()
    url = str(chunk.get("deep_link") or "").strip() or qa.get("deep_link") or ""
    source_id = str(chunk.get("document_id") or chunk.get("id") or "")

    title = title_raw
    reason = reason_raw

    return ReferencesOutput(
        mode="references",
        topic=query,
        recommendations=[
            {
                "title": title,
                "type": "article",
                "level": "basic",
                "reason": reason,
                "url": _decorate_ai_reference_url(url),
                "source_type": _normalize_reference_source_type(str(chunk.get("source_type") or "")),
                "source_ids": [source_id] if source_id else [],
            }
        ],
        notes=["Che do strict dang bat: chi tra loi tu bo QA da phe duyet."],
    ).model_dump(mode="json")


def _normalize_reference_level(level: str | None) -> str | None:
    normalized = str(level or "").strip().lower()
    if normalized in {"basic", "intermediate", "advanced"}:
        return normalized
    return None


def _reference_level_note(level: str | None) -> str:
    labels = {
        "basic": "muc co ban",
        "intermediate": "muc trung cap",
        "advanced": "muc nang cao",
    }
    return labels.get(str(level or "").lower(), "muc phu hop")


def _reference_priority(chunk: dict[str, Any]) -> tuple[float, int, float]:
    source_type = str(chunk.get("source_type") or "").strip().lower()
    distance = float(chunk.get("distance") or 999)
    catalog_score = float(chunk.get("catalog_score") or 0.0)

    if catalog_score > 0:
        priority_map = {
            "course_lesson": 0,
            "course_module": 1,
            "references": 2,
            "quiz": 3,
            "system_docs": 4,
            "custom_qa": 5,
            "faq": 6,
            "policy": 7,
        }
        return -catalog_score, priority_map.get(source_type, 9), distance

    priority_map = {
        "references": 0,
        "course_module": 1,
        "course_lesson": 2,
        "system_docs": 3,
        "custom_qa": 4,
        "faq": 5,
        "policy": 6,
        "quiz": 7,
    }
    return 0.0, priority_map.get(source_type, 9), distance


def _infer_reference_type(chunk: dict[str, Any]) -> str:
    source_type = str(chunk.get("source_type") or "").strip().lower()
    text = " ".join(
        [
            str(chunk.get("document_title") or ""),
            str(chunk.get("chunk_text") or ""),
        ]
    ).lower()
    if "video" in text or "youtube" in text:
        return "video"
    if "book" in text or "sach" in text:
        return "book"
    if source_type == "course_module":
        return "course"
    if source_type == "course_lesson":
        return "article"
    if source_type == "quiz":
        return "course"
    return "article"


def _build_reference_url(chunk: dict[str, Any]) -> str:
    source_type = str(chunk.get("source_type") or "").strip().lower()
    source_id = str(chunk.get("source_id") or "").strip()
    course_id = str(chunk.get("course_id") or "").strip()
    text = str(chunk.get("chunk_text") or "")
    deep_link = _extract_field_by_label(text, "Deep link")

    if source_id.startswith(("http://", "https://", "/")):
        return _decorate_ai_reference_url(source_id)
    if deep_link:
        return _decorate_ai_reference_url(deep_link)
    if source_type in {"course_module", "course_lesson", "quiz"} and course_id:
        return _decorate_ai_reference_url("/dashboard")
    if source_type in {"system_docs", "custom_qa", "faq", "policy"}:
        return "/help"
    if course_id:
        return _decorate_ai_reference_url("/dashboard")
    return ""


def _find_reference_chunk_for_recommendation(
    recommendation: dict[str, Any],
    chunks: list[dict[str, Any]],
) -> dict[str, Any] | None:
    recommendation_url = _decorate_ai_reference_url(str(recommendation.get("url") or ""))
    recommendation_title = _normalize_for_match(str(recommendation.get("title") or ""))

    if recommendation_url:
        for chunk in chunks:
            if _build_reference_url(chunk) == recommendation_url:
                return chunk

    if recommendation_title:
        for chunk in chunks:
            candidate_title = _normalize_for_match(str(chunk.get("document_title") or ""))
            if candidate_title and candidate_title == recommendation_title:
                return chunk

    return None


def _enrich_reference_recommendations(
    output: dict[str, Any],
    chunks: list[dict[str, Any]],
) -> dict[str, Any]:
    raw_recommendations = output.get("recommendations")
    if not isinstance(raw_recommendations, list):
        return output

    enriched: list[dict[str, Any]] = []
    for recommendation in raw_recommendations:
        if not isinstance(recommendation, dict):
            continue

        current = dict(recommendation)
        matched_chunk = _find_reference_chunk_for_recommendation(current, chunks)
        resolved_url = str(current.get("url") or "").strip()
        if matched_chunk is not None:
            resolved_url = _build_reference_url(matched_chunk) or resolved_url

        current["url"] = _decorate_ai_reference_url(resolved_url)

        source_type = _normalize_reference_source_type(str(current.get("source_type") or ""))
        if source_type is None and matched_chunk is not None:
            source_type = _normalize_reference_source_type(str(matched_chunk.get("source_type") or ""))
        if source_type is None:
            source_type = _infer_reference_source_type_from_url(current.get("url") or "")
        if source_type is not None:
            current["source_type"] = source_type

        enriched.append(current)

    output["recommendations"] = enriched
    return output


def _extract_reference_text(chunk: dict[str, Any], title: str) -> str:
    text = str(chunk.get("chunk_text") or "").strip()
    if not text:
        return ""

    condensed = " ".join(text.split())
    if not condensed:
        return ""

    if _normalize_for_match(condensed) == _normalize_for_match(title):
        return ""

    return condensed[:180].rstrip(" ,.;")


def _chunk_has_reference_detail(chunk: dict[str, Any]) -> bool:
    title = str(chunk.get("document_title") or "").strip()
    text = _extract_reference_text(chunk, title)
    return bool(text and len(text.split()) >= 6)


def _has_reference_overlap(query: str, chunk: dict[str, Any]) -> bool:
    query_tokens = _tokenize_for_scope(query)
    if not query_tokens:
        return False

    candidate = " ".join(
        [
            str(chunk.get("document_title") or ""),
            str(chunk.get("chunk_text") or ""),
        ]
    )
    candidate_tokens = _tokenize_for_scope(candidate)
    return bool(query_tokens & candidate_tokens)


def _should_short_circuit_references(query: str, chunks: list[dict[str, Any]]) -> bool:
    if not chunks:
        return True
    if any(str(chunk.get("source_type") or "").strip().lower() == "references" for chunk in chunks[:3]):
        return True
    detailed_count = sum(
        1
        for chunk in chunks
        if str(chunk.get("source_type") or "").strip().lower() != "quiz"
        and _has_reference_overlap(query, chunk)
        and _chunk_has_reference_detail(chunk)
    )
    return detailed_count == 0


def _build_reference_reason(query: str, chunk: dict[str, Any], requested_level: str | None) -> str:
    title = str(chunk.get("document_title") or chunk.get("chunk_text") or query).strip() or query
    source_type = str(chunk.get("source_type") or "").strip().lower()
    level_note = _reference_level_note(requested_level)
    text = _extract_reference_text(chunk, title)
    description = _extract_field_by_label(str(chunk.get("chunk_text") or ""), "Description")
    modules = _extract_field_by_label(str(chunk.get("chunk_text") or ""), "Modules")

    if text:
        return f"Noi dung nay bam sat chu de '{query}' va phu hop de doc nhanh o {level_note}: {text}"
    if source_type == "references" and description:
        return f"Khoa hoc nay gom dung chu de '{query}' va mo ta ro pham vi hoc tap: {description}"
    if source_type == "references" and modules:
        return f"Khoa hoc nay bao phu chu de '{query}' thong qua cac module nhu {modules[:140].rstrip(' ,.;')}."
    if source_type == "course_module":
        return f"Day la module tong quan ve '{title}', phu hop de nam buc tranh lon o {level_note}."
    if source_type == "course_lesson":
        return f"Bai hoc nay tap trung truc tiep vao '{title}', phu hop de dao sau chu de '{query}' o {level_note}."
    if source_type == "quiz":
        return f"Noi dung nay giup ban tu kiem tra muc do hieu ve '{query}' sau khi hoc tai lieu lien quan."
    if source_type in {"system_docs", "custom_qa", "faq", "policy"}:
        return f"Tai lieu nay phu hop de tra cuu nhanh thong tin lien quan den '{query}' o {level_note}."
    return f"Tai lieu nay lien quan truc tiep den '{query}' va phu hop lam diem bat dau o {level_note}."


def _build_heuristic_references_output(
    query: str,
    chunks: list[dict[str, Any]],
    requested_level: str | None,
) -> dict[str, Any]:
    normalized_level = _normalize_reference_level(requested_level) or "basic"
    prioritized = sorted(chunks, key=_reference_priority)
    non_quiz = [chunk for chunk in prioritized if str(chunk.get("source_type") or "").strip().lower() != "quiz"]
    candidates = non_quiz or prioritized

    recommendations: list[dict[str, Any]] = []
    seen_titles: set[str] = set()
    for chunk in candidates:
        title = str(chunk.get("document_title") or chunk.get("chunk_text") or "").strip()
        if not title:
            continue

        title_key = _normalize_for_match(title)
        if not title_key or title_key in seen_titles:
            continue
        seen_titles.add(title_key)

        source_id = str(chunk.get("source_id") or chunk.get("document_id") or chunk.get("id") or "").strip()
        recommendations.append(
            {
                "title": title,
                "type": _infer_reference_type(chunk),
                "level": normalized_level,
                "reason": _build_reference_reason(query, chunk, normalized_level),
                "url": _build_reference_url(chunk),
                "source_type": _normalize_reference_source_type(str(chunk.get("source_type") or "")),
                "source_ids": [source_id] if source_id else [],
            }
        )
        if len(recommendations) >= 4:
            break

    notes = []
    if recommendations:
        notes.append("Danh sach duoc tong hop tu cac tai lieu da index trong he thong.")
        notes.append(f"Uu tien goi y o {_reference_level_note(normalized_level)}.")
    else:
        notes.append("Chua tim thay tai lieu phu hop trong du lieu da index.")

    return ReferencesOutput(
        mode="references",
        topic=query,
        recommendations=recommendations,
        notes=notes,
    ).model_dump(mode="json")


def _validate_with_repair(
    raw: str,
    schema_cls: type,
    system_prompt: str,
    schema_name: str,
    fallback: dict[str, Any],
    prompt_tokens: int | None,
    completion_tokens: int | None,
) -> tuple[dict[str, Any], bool, int | None, int | None]:
    total_prompt = prompt_tokens
    total_completion = completion_tokens

    try:
        parsed = parse_json_str(raw)
        validated = schema_cls.model_validate(parsed)
        return validated.model_dump(mode="json"), False, total_prompt, total_completion
    except (json.JSONDecodeError, ValidationError):
        repair_result = repair_json(system_prompt, raw, schema_name)
        if repair_result.prompt_tokens is not None:
            total_prompt = (total_prompt or 0) + repair_result.prompt_tokens
        if repair_result.completion_tokens is not None:
            total_completion = (total_completion or 0) + repair_result.completion_tokens

        try:
            validated = schema_cls.model_validate(parse_json_str(repair_result.content))
            return validated.model_dump(mode="json"), False, total_prompt, total_completion
        except (json.JSONDecodeError, ValidationError):
            return fallback, True, total_prompt, total_completion


def run_helpdesk(
    query: str,
    role: str,
    course_id: str | None,
) -> tuple[dict[str, Any], list[dict[str, Any]], int, int | None, int | None]:
    started = time.perf_counter()
    settings = get_settings()

    cached_output = _get_cached_response("helpdesk", role, query, course_id)
    if cached_output is not None:
        cached_output["cache_hit"] = True
        cached_output["response_cache_hit"] = True
        latency_ms = int((time.perf_counter() - started) * 1000)
        return cached_output, [], latency_ms, None, None

    strict_mode, strict_source_types, strict_distance = _strict_mode_config("helpdesk")
    if strict_mode:
        fast_entry, fast_score = _strict_qa_lookup(
            query=query,
            role=role,
            course_id=course_id,
            source_types=strict_source_types,
        )
        if fast_entry is not None and fast_score >= 1.0:
            output = _build_strict_helpdesk_answer(query, fast_entry)
            output["fallback_used"] = False
            output["retrieved_count"] = 1
            output["cache_hit"] = True
            output["response_cache_hit"] = False
            output["strict_lookup_hit"] = True
            output["strict_relevance_score"] = round(fast_score, 4)
            _set_cached_response("helpdesk", role, query, course_id, output)
            latency_ms = int((time.perf_counter() - started) * 1000)
            return output, [fast_entry], latency_ms, None, None

        output = _strict_helpdesk_refusal(
            query,
            suggested_questions=list_helpdesk_suggestions(
                role=role,
                course_id=course_id,
                source_types=strict_source_types,
                query=query,
                limit=3,
            ),
        )
        output["fallback_used"] = False
        output["retrieved_count"] = 0
        output["cache_hit"] = True
        output["response_cache_hit"] = False
        output["strict_lookup_hit"] = False
        output["strict_relevance_score"] = round(fast_score, 4)
        _set_cached_response("helpdesk", role, query, course_id, output)
        latency_ms = int((time.perf_counter() - started) * 1000)
        return output, [], latency_ms, None, None

    chunks, cache_hit = retrieve_chunks(
        mode="helpdesk",
        role=role,
        query=query,
        course_id=course_id,
        top_k=5,
        source_types=strict_source_types,
        max_distance=strict_distance,
    )

    strict_score, best_chunk = _strict_best_match(query, chunks) if strict_mode else (0.0, None)
    strict_miss = strict_mode and (
        len(chunks) < settings.strict_qa_min_chunks
        or strict_score < settings.strict_qa_min_token_overlap
    )
    if strict_miss:
        output = _strict_helpdesk_refusal(
            query,
            suggested_questions=list_helpdesk_suggestions(
                role=role,
                course_id=course_id,
                source_types=strict_source_types,
                query=query,
                limit=3,
            ),
        )
        output["fallback_used"] = False
        output["retrieved_count"] = len(chunks)
        output["cache_hit"] = cache_hit
        output["response_cache_hit"] = False
        output["strict_relevance_score"] = round(strict_score, 4)
        _set_cached_response("helpdesk", role, query, course_id, output)
        latency_ms = int((time.perf_counter() - started) * 1000)
        return output, chunks, latency_ms, None, None
    if strict_mode and best_chunk is not None:
        output = _build_strict_helpdesk_answer(query, best_chunk)
        output["fallback_used"] = False
        output["retrieved_count"] = len(chunks)
        output["cache_hit"] = cache_hit
        output["response_cache_hit"] = False
        output["strict_relevance_score"] = round(strict_score, 4)
        _set_cached_response("helpdesk", role, query, course_id, output)
        latency_ms = int((time.perf_counter() - started) * 1000)
        return output, chunks, latency_ms, None, None

    context = format_context(chunks)
    strict_note = (
        "Strict QA-only mode is enabled. "
        "If context is insufficient, return refusal within helpdesk schema.\n"
        if strict_mode
        else ""
    )

    prompt = (
        f"User question: {query}\n"
        f"{strict_note}"
        f"Formatting examples:\n{json.dumps(_build_style_examples('helpdesk', HELPDESK_FEW_SHOT), ensure_ascii=False)}\n"
        f"{context}\n"
    )
    result = generate_json(
        HELPDESK_SYSTEM_PROMPT,
        prompt,
        max_tokens=settings.llm_max_tokens_helpdesk,
    )

    fallback = HelpdeskOutput(
        mode="helpdesk",
        answer_title="Chưa thể tạo câu trả lời đầy đủ lúc này",
        steps=[],
        common_issues=[
            {
                "symptom": "Thiếu ngữ cảnh cho yêu cầu này",
                "cause": "Không truy xuất được chunk phù hợp",
                "fix": "Vui lòng thử lại sau vài giây",
            }
        ],
    ).model_dump(mode="json")

    output, fallback_used, prompt_tokens, completion_tokens = _validate_with_repair(
        raw=result.content,
        schema_cls=HelpdeskOutput,
        system_prompt=HELPDESK_SYSTEM_PROMPT,
        schema_name="helpdesk",
        fallback=fallback,
        prompt_tokens=result.prompt_tokens,
        completion_tokens=result.completion_tokens,
    )

    output["fallback_used"] = fallback_used
    output["retrieved_count"] = len(chunks)
    output["cache_hit"] = cache_hit
    output["response_cache_hit"] = False
    if strict_mode:
        output["strict_relevance_score"] = round(strict_score, 4)

    _set_cached_response("helpdesk", role, query, course_id, output)

    latency_ms = int((time.perf_counter() - started) * 1000)
    return output, chunks, latency_ms, prompt_tokens, completion_tokens


def run_references(
    query: str,
    role: str,
    course_id: str | None,
    requested_level: str | None = None,
) -> tuple[dict[str, Any], list[dict[str, Any]], int, int | None, int | None]:
    started = time.perf_counter()
    settings = get_settings()
    normalized_level = _normalize_reference_level(requested_level)
    cache_variant = f"level={normalized_level or ''}"

    cached_output = _get_cached_response("references", role, query, course_id, cache_variant)
    if cached_output is not None:
        cached_output = _enrich_reference_recommendations(cached_output, [])
        cached_output["cache_hit"] = True
        cached_output["response_cache_hit"] = True
        latency_ms = int((time.perf_counter() - started) * 1000)
        return cached_output, [], latency_ms, None, None

    strict_mode, strict_source_types, strict_distance = _strict_mode_config("references")
    if strict_mode:
        fast_entry, fast_score = _strict_qa_lookup(
            query=query,
            role=role,
            course_id=course_id,
            source_types=strict_source_types,
        )
        if fast_entry is not None and fast_score >= 1.0:
            output = _build_strict_references_answer(query, fast_entry)
            output = _enrich_reference_recommendations(output, [fast_entry])
            output["fallback_used"] = False
            output["retrieved_count"] = 1
            output["cache_hit"] = True
            output["response_cache_hit"] = False
            output["strict_lookup_hit"] = True
            output["strict_relevance_score"] = round(fast_score, 4)
            _set_cached_response("references", role, query, course_id, output, cache_variant)
            latency_ms = int((time.perf_counter() - started) * 1000)
            return output, [fast_entry], latency_ms, None, None

        output = _strict_references_refusal(query)
        output["fallback_used"] = False
        output["retrieved_count"] = 0
        output["cache_hit"] = True
        output["response_cache_hit"] = False
        output["strict_lookup_hit"] = False
        output["strict_relevance_score"] = round(fast_score, 4)
        _set_cached_response("references", role, query, course_id, output, cache_variant)
        latency_ms = int((time.perf_counter() - started) * 1000)
        return output, [], latency_ms, None, None

    catalog_matches = search_reference_catalog(query, limit=4)
    top_catalog_score = float(catalog_matches[0].get("catalog_score") or 0.0) if catalog_matches else 0.0
    if top_catalog_score >= 0.9:
        output = _build_heuristic_references_output(query, catalog_matches, normalized_level)
        output = _enrich_reference_recommendations(output, catalog_matches)
        output["fallback_used"] = True
        output["retrieved_count"] = len(catalog_matches)
        output["cache_hit"] = False
        output["response_cache_hit"] = False
        output["catalog_match_score"] = round(top_catalog_score, 4)
        _set_cached_response("references", role, query, course_id, output, cache_variant)
        latency_ms = int((time.perf_counter() - started) * 1000)
        return output, catalog_matches, latency_ms, None, None

    chunks, cache_hit = retrieve_chunks(
        mode="references",
        role=role,
        query=query,
        course_id=course_id,
        top_k=6,
        source_types=_REFERENCE_SOURCE_TYPES,
        max_distance=strict_distance,
        null_course_only=course_id is None,
    )

    strict_score, best_chunk = _strict_best_match(query, chunks) if strict_mode else (0.0, None)
    strict_miss = strict_mode and (
        len(chunks) < settings.strict_qa_min_chunks
        or strict_score < settings.strict_qa_min_token_overlap
    )
    if strict_miss:
        output = _strict_references_refusal(query)
        output["fallback_used"] = False
        output["retrieved_count"] = len(chunks)
        output["cache_hit"] = cache_hit
        output["response_cache_hit"] = False
        output["strict_relevance_score"] = round(strict_score, 4)
        _set_cached_response("references", role, query, course_id, output, cache_variant)
        latency_ms = int((time.perf_counter() - started) * 1000)
        return output, chunks, latency_ms, None, None
    if strict_mode and best_chunk is not None:
        output = _build_strict_references_answer(query, best_chunk)
        output = _enrich_reference_recommendations(output, [best_chunk])
        output["fallback_used"] = False
        output["retrieved_count"] = len(chunks)
        output["cache_hit"] = cache_hit
        output["response_cache_hit"] = False
        output["strict_relevance_score"] = round(strict_score, 4)
        _set_cached_response("references", role, query, course_id, output, cache_variant)
        latency_ms = int((time.perf_counter() - started) * 1000)
        return output, chunks, latency_ms, None, None

    if _should_short_circuit_references(query, chunks):
        output = _build_heuristic_references_output(query, chunks, normalized_level)
        output = _enrich_reference_recommendations(output, chunks)
        output["fallback_used"] = True
        output["retrieved_count"] = len(chunks)
        output["cache_hit"] = cache_hit
        output["response_cache_hit"] = False
        if strict_mode:
            output["strict_relevance_score"] = round(strict_score, 4)
        _set_cached_response("references", role, query, course_id, output, cache_variant)
        latency_ms = int((time.perf_counter() - started) * 1000)
        return output, chunks, latency_ms, None, None

    context = format_context(chunks)
    strict_note = (
        "Strict QA-only mode is enabled. "
        "If context is insufficient, return refusal within references schema.\n"
        if strict_mode
        else ""
    )

    prompt = (
        f"User question: {query}\n"
        f"Requested level: {normalized_level or 'basic'}\n"
        f"{strict_note}"
        f"Formatting examples:\n{json.dumps(_build_style_examples('references', REFERENCES_FEW_SHOT), ensure_ascii=False)}\n"
        f"{context}\n"
    )
    result = generate_json(
        REFERENCES_SYSTEM_PROMPT,
        prompt,
        max_tokens=settings.llm_max_tokens_references,
    )

    fallback = ReferencesOutput(
        mode="references",
        topic=query,
        recommendations=[],
        notes=["Vui lòng thử lại sau vài giây."],
    ).model_dump(mode="json")

    output, fallback_used, prompt_tokens, completion_tokens = _validate_with_repair(
        raw=result.content,
        schema_cls=ReferencesOutput,
        system_prompt=REFERENCES_SYSTEM_PROMPT,
        schema_name="references",
        fallback=fallback,
        prompt_tokens=result.prompt_tokens,
        completion_tokens=result.completion_tokens,
    )
    output = _enrich_reference_recommendations(output, chunks)
    output["fallback_used"] = fallback_used
    output["retrieved_count"] = len(chunks)
    output["cache_hit"] = cache_hit
    output["response_cache_hit"] = False
    if strict_mode:
        output["strict_relevance_score"] = round(strict_score, 4)

    if not output.get("recommendations"):
        output = _build_heuristic_references_output(query, chunks, normalized_level)
        output = _enrich_reference_recommendations(output, chunks)
        output["fallback_used"] = True
        output["retrieved_count"] = len(chunks)
        output["cache_hit"] = cache_hit
        output["response_cache_hit"] = False
        if strict_mode:
            output["strict_relevance_score"] = round(strict_score, 4)

    _set_cached_response("references", role, query, course_id, output, cache_variant)

    latency_ms = int((time.perf_counter() - started) * 1000)
    return output, chunks, latency_ms, prompt_tokens, completion_tokens


def run_assistant(
    query: str,
    role: str,
    course_id: str | None,
    requested_mode: str = "auto",
    requested_level: str | None = None,
) -> tuple[dict[str, Any], str | None, list[dict[str, Any]], int, int | None, int | None]:
    started = time.perf_counter()
    normalized_mode = requested_mode if requested_mode in {"auto", "helpdesk", "references"} else "auto"
    reference_query = _assistant_reference_query(query)

    if normalized_mode == "helpdesk":
        output, chunks, latency_ms, prompt_tokens, completion_tokens = run_helpdesk(query, role, course_id)
        return (
            {
                "kind": "helpdesk",
                "requested_mode": normalized_mode,
                "resolved_mode": "helpdesk",
                "route_reason": "manual_override",
                "data": output,
            },
            "helpdesk",
            chunks,
            latency_ms,
            prompt_tokens,
            completion_tokens,
        )

    if normalized_mode == "references":
        output, chunks, latency_ms, prompt_tokens, completion_tokens = run_references(
            reference_query,
            role,
            course_id,
            requested_level,
        )
        output["topic"] = query
        return (
            {
                "kind": "references",
                "requested_mode": normalized_mode,
                "resolved_mode": "references",
                "route_reason": "manual_override",
                "data": output,
            },
            "references",
            chunks,
            latency_ms,
            prompt_tokens,
            completion_tokens,
        )

    resolved_mode, route_reason = _resolve_assistant_mode(query, role, course_id)
    if resolved_mode == "helpdesk":
        output, chunks, latency_ms, prompt_tokens, completion_tokens = run_helpdesk(query, role, course_id)
        return (
            {
                "kind": "helpdesk",
                "requested_mode": normalized_mode,
                "resolved_mode": "helpdesk",
                "route_reason": route_reason,
                "data": output,
            },
            "helpdesk",
            chunks,
            latency_ms,
            prompt_tokens,
            completion_tokens,
        )

    if resolved_mode == "references":
        output, chunks, latency_ms, prompt_tokens, completion_tokens = run_references(
            reference_query,
            role,
            course_id,
            requested_level,
        )
        output["topic"] = query
        return (
            {
                "kind": "references",
                "requested_mode": normalized_mode,
                "resolved_mode": "references",
                "route_reason": route_reason,
                "data": output,
            },
            "references",
            chunks,
            latency_ms,
            prompt_tokens,
            completion_tokens,
        )

    latency_ms = int((time.perf_counter() - started) * 1000)
    return _assistant_clarify_output(normalized_mode), None, [], latency_ms, None, None


def run_mentor(context: dict[str, Any]) -> tuple[dict[str, Any], int, int | None, int | None]:
    started = time.perf_counter()
    settings = get_settings()

    rule_based = {
        "mode": "mentor",
        "summary": "Kế hoạch học hôm nay đã sẵn sàng.",
        "today_plan": context.get("today_plan", []),
        "overdue": context.get("overdue", []),
        "metrics": context.get(
            "metrics",
            {
                "progress_pct": 0,
                "streak_days": 0,
                "last_activity": datetime.now(tz=timezone.utc).date().isoformat(),
            },
        ),
    }

    prompt = (
        "Rewrite this mentor response to be clear and concise. "
        "Do not change structure.\n"
        f"Data: {json.dumps(rule_based, ensure_ascii=False)}\n"
        f"Style examples: {json.dumps(_build_style_examples('mentor'), ensure_ascii=False)}"
    )
    result = generate_json(
        MENTOR_SYSTEM_PROMPT,
        prompt,
        max_tokens=settings.llm_max_tokens_mentor,
    )

    output, fallback_used, prompt_tokens, completion_tokens = _validate_with_repair(
        raw=result.content,
        schema_cls=MentorOutput,
        system_prompt=MENTOR_SYSTEM_PROMPT,
        schema_name="mentor",
        fallback=rule_based,
        prompt_tokens=result.prompt_tokens,
        completion_tokens=result.completion_tokens,
    )
    output["fallback_used"] = fallback_used
    output["cache_hit"] = False
    output["response_cache_hit"] = False

    latency_ms = int((time.perf_counter() - started) * 1000)
    return output, latency_ms, prompt_tokens, completion_tokens


def run_assignment(
    user_id: str,
    question: str,
    student_attempt: str | None,
    role: str,
    course_id: str | None,
) -> tuple[dict[str, Any], list[dict[str, Any]], int, int | None, int | None]:
    started = time.perf_counter()
    settings = get_settings()
    blocked, reason = should_block_assignment(question, student_attempt)

    chunks, cache_hit = retrieve_chunks(
        mode="assignment", role=role, query=question, course_id=course_id, top_k=4
    )
    context = format_context(chunks)

    if blocked:
        log_policy_violation(user_id=user_id, mode="assignment", reason=reason)

    policy_note = (
        "blocked=true because direct-answer intent was detected"
        if blocked
        else "blocked=false and response must remain hint-only"
    )

    prompt = (
        f"Question: {question}\n"
        f"Current attempt: {student_attempt or ''}\n"
        f"Policy: {policy_note}\n"
        f"Style examples: {json.dumps(_build_style_examples('assignment'), ensure_ascii=False)}\n"
        f"{context}\n"
    )

    result = generate_json(
        ASSIGNMENT_SYSTEM_PROMPT,
        prompt,
        max_tokens=settings.llm_max_tokens_assignment,
    )

    fallback = AssignmentOutput(
        mode="assignment",
        restate=question,
        blocked=blocked,
        block_reason=reason if blocked else "",
        allowed_help=[
            "Giải thích khái niệm liên quan",
            "Gợi ý từng bước",
            "Đưa checklist tự kiểm tra",
        ],
        hints=[
            {
                "hint": "Hãy tách bài toán thành các bước nhỏ trước khi giải.",
                "why": "Cách này giúp bạn tự giải được mà không lộ đáp án cuối.",
            }
        ],
        self_check=["Bạn đã kiểm tra các ràng buộc và trường hợp biên chưa?"],
    ).model_dump(mode="json")

    output, fallback_used, prompt_tokens, completion_tokens = _validate_with_repair(
        raw=result.content,
        schema_cls=AssignmentOutput,
        system_prompt=ASSIGNMENT_SYSTEM_PROMPT,
        schema_name="assignment",
        fallback=fallback,
        prompt_tokens=result.prompt_tokens,
        completion_tokens=result.completion_tokens,
    )

    output["blocked"] = blocked or output.get("blocked", False)
    if blocked and not output.get("block_reason"):
        output["block_reason"] = reason
    output["fallback_used"] = fallback_used
    output["retrieved_count"] = len(chunks)
    output["cache_hit"] = cache_hit
    output["response_cache_hit"] = False

    latency_ms = int((time.perf_counter() - started) * 1000)
    return output, chunks, latency_ms, prompt_tokens, completion_tokens


def build_overdue_from_context(context: dict[str, Any], overdue_days: int) -> list[dict[str, Any]]:
    pending = context.get("pending_lessons", [])
    last_activity = context.get("last_activity_at")

    if not pending or not last_activity:
        return []

    try:
        last = datetime.fromisoformat(str(last_activity).replace("Z", "+00:00"))
    except ValueError:
        return []

    inactive_days = (datetime.now(tz=timezone.utc) - last).days
    if inactive_days < overdue_days:
        return []

    results: list[dict[str, Any]] = []
    for lesson in pending[:3]:
        results.append(
            {
                "lesson_id": str(lesson.get("id", "")),
                "title": str(lesson.get("title", "Unfinished lesson")),
                "reason": f"Không có hoạt động học tập trong {inactive_days} ngày.",
                "cta": {
                    "label": "Tiếp tục học",
                    "href": str(lesson.get("href", "/my-courses")),
                },
            }
        )
    return results


def build_today_plan(context: dict[str, Any]) -> list[dict[str, Any]]:
    pending = context.get("pending_lessons", [])
    plans: list[dict[str, Any]] = []

    for lesson in pending[:3]:
        plans.append(
            {
                "task": f"Hoàn thành: {lesson.get('title', 'Bài học')}",
                "eta_min": int(lesson.get("eta_min", 20)),
                "why": "Giữ nhịp học ổn định để tăng tiến độ khóa học.",
                "cta": {
                    "label": "Mở bài học",
                    "href": str(lesson.get("href", "/my-courses")),
                },
            }
        )

    if not plans:
        plans.append(
            {
                "task": "Ôn lại bài học gần nhất",
                "eta_min": 15,
                "why": "Củng cố kiến thức trọng tâm trước khi học tiếp.",
                "cta": {"label": "Mở khóa học", "href": "/my-courses"},
            }
        )

    return plans


def build_metrics(context: dict[str, Any]) -> dict[str, Any]:
    metrics = context.get("metrics", {})
    return {
        "progress_pct": float(metrics.get("progress_pct", 0)),
        "streak_days": int(metrics.get("streak_days", 0)),
        "last_activity": metrics.get("last_activity"),
    }


def build_mentor_context(context: dict[str, Any]) -> dict[str, Any]:
    settings = get_settings()
    metrics = build_metrics(context)
    overdue = build_overdue_from_context(context, settings.mentor_overdue_days)
    today_plan = build_today_plan(context)

    return {
        "metrics": metrics,
        "overdue": overdue,
        "today_plan": today_plan,
    }
