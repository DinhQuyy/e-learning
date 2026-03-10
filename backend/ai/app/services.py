from __future__ import annotations

import hashlib
import json
import re
import time
import unicodedata
from difflib import SequenceMatcher
from datetime import datetime, timezone
from typing import Any

from pydantic import ValidationError

from .config import get_settings
from .db import fetch_all
from .llm import generate_json, parse_json_str, repair_json
from .models import AssignmentOutput, HelpdeskOutput, MentorOutput, ReferencesOutput
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
_QA_LABEL_PATTERN = r"(?:Question|Answer|Deep link|Aliases|Tags|Notes)"


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
        rf"{escaped_label}:\s*(.*?)(?=(?:\s+{_QA_LABEL_PATTERN}:)|$)",
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


def _response_cache_key(mode: str, role: str, query: str, course_id: str | None) -> str:
    raw = f"{mode}:{role}:{_normalize_query(query)}:{course_id or ''}"
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return f"ai:response:{mode}:{digest}"


def _get_cached_response(mode: str, role: str, query: str, course_id: str | None) -> dict[str, Any] | None:
    redis = get_redis()
    key = _response_cache_key(mode, role, query, course_id)
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
) -> None:
    settings = get_settings()
    if settings.response_cache_ttl_sec <= 0:
        return
    redis = get_redis()
    key = _response_cache_key(mode, role, query, course_id)
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
                "url": url,
                "source_ids": [source_id] if source_id else [],
            }
        ],
        notes=["Che do strict dang bat: chi tra loi tu bo QA da phe duyet."],
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
) -> tuple[dict[str, Any], list[dict[str, Any]], int, int | None, int | None]:
    started = time.perf_counter()
    settings = get_settings()

    cached_output = _get_cached_response("references", role, query, course_id)
    if cached_output is not None:
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
            output["fallback_used"] = False
            output["retrieved_count"] = 1
            output["cache_hit"] = True
            output["response_cache_hit"] = False
            output["strict_lookup_hit"] = True
            output["strict_relevance_score"] = round(fast_score, 4)
            _set_cached_response("references", role, query, course_id, output)
            latency_ms = int((time.perf_counter() - started) * 1000)
            return output, [fast_entry], latency_ms, None, None

        output = _strict_references_refusal(query)
        output["fallback_used"] = False
        output["retrieved_count"] = 0
        output["cache_hit"] = True
        output["response_cache_hit"] = False
        output["strict_lookup_hit"] = False
        output["strict_relevance_score"] = round(fast_score, 4)
        _set_cached_response("references", role, query, course_id, output)
        latency_ms = int((time.perf_counter() - started) * 1000)
        return output, [], latency_ms, None, None

    chunks, cache_hit = retrieve_chunks(
        mode="references",
        role=role,
        query=query,
        course_id=course_id,
        top_k=6,
        source_types=strict_source_types,
        max_distance=strict_distance,
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
        _set_cached_response("references", role, query, course_id, output)
        latency_ms = int((time.perf_counter() - started) * 1000)
        return output, chunks, latency_ms, None, None
    if strict_mode and best_chunk is not None:
        output = _build_strict_references_answer(query, best_chunk)
        output["fallback_used"] = False
        output["retrieved_count"] = len(chunks)
        output["cache_hit"] = cache_hit
        output["response_cache_hit"] = False
        output["strict_relevance_score"] = round(strict_score, 4)
        _set_cached_response("references", role, query, course_id, output)
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
    output["fallback_used"] = fallback_used
    output["retrieved_count"] = len(chunks)
    output["cache_hit"] = cache_hit
    output["response_cache_hit"] = False
    if strict_mode:
        output["strict_relevance_score"] = round(strict_score, 4)

    _set_cached_response("references", role, query, course_id, output)

    latency_ms = int((time.perf_counter() - started) * 1000)
    return output, chunks, latency_ms, prompt_tokens, completion_tokens


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
