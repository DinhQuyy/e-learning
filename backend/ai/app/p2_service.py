from __future__ import annotations

import re
import time
from collections import Counter, defaultdict
from typing import Any

from .chat_service import _extract_output_text, _json_dump, _parse_json, _send_openai_request
from .config import get_settings
from .db import fetch_all, fetch_one
from .models import (
    LessonReferenceIntent,
    LessonReferenceItem,
    LessonReferencesResponse,
    QuizConceptToReview,
    QuizLessonRevisitItem,
    QuizMistakeCluster,
    QuizMistakeReviewResponse,
    RoleType,
)
from .store import get_cached_quiz_mistake_review, save_cached_quiz_mistake_review
from .tool_registry import _build_acl, _normalize_search_text, _strip_html

LESSON_REFERENCE_LIMIT = 4
QUIZ_MISTAKE_REVIEW_PROMPT_VERSION = "quiz-mistake-review-v1"

QUIZ_MISTAKE_REVIEW_RESPONSE_FORMAT = {
    "type": "json_schema",
    "name": "quiz_mistake_review_response",
    "strict": True,
    "schema": {
        "type": "object",
        "properties": {
            "review_state": {"type": "string", "enum": ["has_mistakes", "perfect_attempt"]},
            "summary": {"type": "string"},
            "mistake_clusters": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "description": {"type": "string"},
                        "question_ids": {"type": "array", "items": {"type": "string"}},
                    },
                    "required": ["title", "description", "question_ids"],
                    "additionalProperties": False,
                },
            },
            "concepts_to_review": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "reason": {"type": "string"},
                    },
                    "required": ["title", "reason"],
                    "additionalProperties": False,
                },
            },
            "lessons_to_revisit": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "reason": {"type": "string"},
                        "cta_href": {"type": "string"},
                        "lesson_id": {"anyOf": [{"type": "string"}, {"type": "null"}]},
                        "module_id": {"anyOf": [{"type": "string"}, {"type": "null"}]},
                    },
                    "required": ["title", "reason", "cta_href", "lesson_id", "module_id"],
                    "additionalProperties": False,
                },
            },
            "recovery_plan": {"type": "array", "items": {"type": "string"}},
            "follow_up_prompts": {"type": "array", "items": {"type": "string"}},
        },
        "required": [
            "review_state",
            "summary",
            "mistake_clusters",
            "concepts_to_review",
            "lessons_to_revisit",
            "recovery_plan",
            "follow_up_prompts",
        ],
        "additionalProperties": False,
    },
}

_STOPWORDS = {
    "va",
    "và",
    "cua",
    "của",
    "cho",
    "voi",
    "với",
    "trong",
    "nhung",
    "những",
    "the",
    "thể",
    "khong",
    "không",
    "mot",
    "một",
    "cac",
    "các",
    "bai",
    "bài",
    "lesson",
    "quiz",
    "question",
    "cau",
    "câu",
    "dang",
    "đang",
    "sau",
    "truoc",
    "trước",
    "hien",
    "hiện",
    "tai",
    "tại",
    "more",
    "read",
    "example",
}


def _lesson_url(course_slug: str, lesson_slug: str) -> str:
    return f"/learn/{course_slug}/{lesson_slug}"


def _course_url(course_slug: str) -> str:
    return f"/courses/{course_slug}"


def _tokenize(value: str) -> list[str]:
    normalized = _normalize_search_text(value)
    return [token for token in normalized.split(" ") if len(token) >= 3 and token not in _STOPWORDS]


def _topic_tokens(title: str, body_text: str) -> list[str]:
    counter = Counter(_tokenize(f"{title} {body_text[:900]}"))
    return [token for token, _ in counter.most_common(12)]


def _keyword_overlap_score(base_tokens: list[str], *parts: str) -> int:
    if not base_tokens:
        return 0
    haystack_tokens = set(_tokenize(" ".join(parts)))
    return sum(1 for token in base_tokens if token in haystack_tokens)


def _fetch_reference_context(lesson_id: str, role: RoleType, user_id: str) -> dict[str, Any] | None:
    acl_sql, acl_params = _build_acl(role, user_id)
    return fetch_one(
        f"""
        SELECT
            l.id AS lesson_id,
            l.title AS lesson_title,
            l.slug AS lesson_slug,
            COALESCE(l.content, '') AS lesson_content,
            l.type AS lesson_type,
            l.duration AS lesson_duration,
            m.id AS module_id,
            COALESCE(m.title, '') AS module_title,
            m.sort AS module_sort,
            c.id AS course_id,
            c.title AS course_title,
            c.slug AS course_slug,
            c.level AS course_level,
            cat.id AS category_id,
            COALESCE(cat.name, '') AS category_name
        FROM lessons l
        JOIN modules m ON m.id = l.module_id
        JOIN courses c ON c.id = m.course_id
        LEFT JOIN categories cat ON cat.id = c.category_id
        WHERE ({acl_sql})
          AND (%s <> 'student' OR COALESCE(l.status, 'published') = 'published')
          AND l.id = %s
        LIMIT 1
        """,
        tuple([*acl_params, role, lesson_id]),
    )


def _fetch_reference_candidates(context: dict[str, Any], role: RoleType, user_id: str) -> list[dict[str, Any]]:
    acl_sql, acl_params = _build_acl(role, user_id)
    return fetch_all(
        f"""
        SELECT
            l.id AS lesson_id,
            l.title AS lesson_title,
            l.slug AS lesson_slug,
            COALESCE(l.content, '') AS lesson_content,
            l.type AS lesson_type,
            l.duration AS lesson_duration,
            m.id AS module_id,
            COALESCE(m.title, '') AS module_title,
            m.sort AS module_sort,
            c.id AS course_id,
            c.title AS course_title,
            c.slug AS course_slug,
            c.level AS course_level,
            cat.id AS category_id,
            COALESCE(cat.name, '') AS category_name
        FROM lessons l
        JOIN modules m ON m.id = l.module_id
        JOIN courses c ON c.id = m.course_id
        LEFT JOIN categories cat ON cat.id = c.category_id
        WHERE ({acl_sql})
          AND (%s <> 'student' OR COALESCE(l.status, 'published') = 'published')
          AND l.id <> %s
          AND (
            c.id = %s
            OR (%s <> '' AND COALESCE(cat.id::text, '') = %s)
          )
        ORDER BY c.title ASC, m.sort ASC, l.sort ASC
        """,
        tuple(
            [
                *acl_params,
                role,
                str(context["lesson_id"]),
                str(context["course_id"]),
                str(context["category_id"] or ""),
                str(context["category_id"] or ""),
            ]
        ),
    )


def _fetch_curated_reference_resources() -> list[dict[str, Any]]:
    try:
        return fetch_all(
            """
        SELECT
            r.id,
            r.title,
            r.url,
            COALESCE(r.source_name, '') AS source_name,
            COALESCE(r.summary, '') AS summary,
            COALESCE(r.language, '') AS language,
            COALESCE(r.difficulty, '') AS difficulty,
            COALESCE(r.resource_type, '') AS resource_type,
            COALESCE(r.intent_hint, '') AS intent_hint,
            COALESCE(r.provenance_note, '') AS provenance_note,
            r.reviewed_at,
            COALESCE(string_agg(DISTINCT COALESCE(t.name, ''), ' '), '') AS topic_names,
            COALESCE(string_agg(DISTINCT COALESCE(t.keywords, ''), ' '), '') AS topic_keywords
        FROM ai_reference_resources r
        LEFT JOIN ai_reference_resource_topics rt ON rt.resource_id = r.id
        LEFT JOIN ai_reference_topics t ON t.id = rt.topic_id AND COALESCE(t.status, 'draft') = 'published'
        WHERE COALESCE(r.status, 'draft') = 'published'
          AND r.reviewed_at IS NOT NULL
        GROUP BY
            r.id,
            r.title,
            r.url,
            r.source_name,
            r.summary,
            r.language,
            r.difficulty,
            r.resource_type,
            r.intent_hint,
            r.provenance_note,
            r.reviewed_at
        ORDER BY r.reviewed_at DESC, r.title ASC
        """
        )
    except Exception:
        return []


def _bucket_external_reference(row: dict[str, Any], score: int) -> str | None:
    intent_hint = str(row.get("intent_hint") or "").strip().lower()
    if intent_hint in {"foundations", "read_more", "examples", "advanced"}:
        return intent_hint

    resource_type = _normalize_search_text(str(row.get("resource_type") or ""))
    difficulty = _normalize_search_text(str(row.get("difficulty") or ""))
    summary = _normalize_search_text(
        " ".join(
            [
                str(row.get("title") or ""),
                str(row.get("summary") or ""),
                str(row.get("topic_names") or ""),
                str(row.get("topic_keywords") or ""),
            ]
        )
    )
    if any(keyword in summary for keyword in ("example", "vi du", "walkthrough", "demo", "case study")):
        return "examples"
    if difficulty in {"beginner", "co ban", "foundation"}:
        return "foundations"
    if difficulty in {"advanced", "nang cao"}:
        return "advanced"
    if score > 0 or resource_type:
        return "read_more"
    return None


def build_lesson_references(
    *,
    lesson_id: str,
    user_id: str,
    role: RoleType,
    intent: LessonReferenceIntent | None,
) -> dict[str, Any]:
    context = _fetch_reference_context(lesson_id, role, user_id)
    if not context:
        return LessonReferencesResponse(source_scope="internal_only", intents=[], items=[]).model_dump(mode="json")

    current_text = _strip_html(str(context.get("lesson_content") or ""))
    topic_tokens = _topic_tokens(str(context.get("lesson_title") or ""), current_text)
    candidates = _fetch_reference_candidates(context, role, user_id)

    buckets: dict[str, list[tuple[int, int, LessonReferenceItem]]] = defaultdict(list)
    seen_links: set[str] = set()

    for row in candidates:
        body_text = _strip_html(str(row.get("lesson_content") or ""))
        score = _keyword_overlap_score(
            topic_tokens,
            str(row.get("lesson_title") or ""),
            str(row.get("module_title") or ""),
            str(row.get("course_title") or ""),
            body_text[:900],
        )
        same_course = str(row.get("course_id") or "") == str(context.get("course_id") or "")
        same_module = str(row.get("module_id") or "") == str(context.get("module_id") or "")
        if same_course:
            score += 3
        if same_module:
            score += 3
        if score <= 0:
            continue

        course_slug = str(row.get("course_slug") or "").strip()
        lesson_slug = str(row.get("lesson_slug") or "").strip()
        lesson_href = _lesson_url(course_slug, lesson_slug)
        if not course_slug or not lesson_slug or lesson_href in seen_links:
            continue

        title = str(row.get("lesson_title") or "").strip()
        subtitle = " • ".join(
            part
            for part in [
                str(row.get("course_title") or "").strip(),
                str(row.get("module_title") or "").strip(),
            ]
            if part
        )

        body_lower = _normalize_search_text(f"{title} {body_text[:500]}")
        current_module_sort = int(context.get("module_sort") or 0)
        candidate_module_sort = int(row.get("module_sort") or 0)

        if any(keyword in body_lower for keyword in ("vi du", "example", "walkthrough", "checklist", "demo")):
            bucket = "examples"
            reason = "Nội dung này thiên về ví dụ, walkthrough hoặc checklist gần với chủ đề bạn đang học."
        elif same_course and candidate_module_sort <= current_module_sort:
            bucket = "foundations"
            reason = "Nội dung này đi trước hoặc song song trong cùng khóa học và phù hợp để ôn nền tảng liên quan."
        elif same_course:
            bucket = "read_more"
            reason = "Nội dung này nằm gần bài hiện tại trong cùng khóa học và mở rộng trực tiếp chủ đề đang học."
        else:
            bucket = "advanced"
            reason = "Nội dung này mở rộng chủ đề sang bài học hoặc khóa học liên quan ở phạm vi sâu hơn."

        item = LessonReferenceItem(
            kind="lesson",
            source_type="internal",
            title=title,
            subtitle=subtitle or None,
            reason=reason,
            cta_label="Mở bài học",
            cta_href=lesson_href,
            course_id=str(row.get("course_id") or "") or None,
            lesson_id=str(row.get("lesson_id") or "") or None,
            module_id=str(row.get("module_id") or "") or None,
        )
        buckets[bucket].append((score, 0, item))
        seen_links.add(lesson_href)

    # Add broader course-level advanced references only when intra-course signal is weak.
    if len(buckets.get("read_more", [])) + len(buckets.get("foundations", [])) < 3:
        related_courses = fetch_all(
            """
            SELECT c.id, c.title, c.slug, COALESCE(cat.name, '') AS category_name
            FROM courses c
            LEFT JOIN categories cat ON cat.id = c.category_id
            WHERE c.id <> %s
              AND cat.id IS NOT NULL
              AND (%s <> '' AND COALESCE(cat.id::text, '') = %s)
              AND c.status = 'published'
            ORDER BY c.total_enrollments DESC, c.average_rating DESC
            LIMIT 3
            """,
            (
                str(context["course_id"]),
                str(context.get("category_id") or ""),
                str(context.get("category_id") or ""),
            ),
        )
        for row in related_courses:
            href = _course_url(str(row.get("slug") or ""))
            if not href or href in seen_links:
                continue
            buckets["advanced"].append(
                (
                    1,
                    0,
                    LessonReferenceItem(
                        kind="course",
                        source_type="internal",
                        title=str(row.get("title") or "").strip(),
                        subtitle=str(row.get("category_name") or "").strip() or None,
                        reason="Khóa học này cùng nhóm chủ đề và phù hợp nếu bạn muốn đào sâu hơn sau bài hiện tại.",
                        cta_label="Mở khóa học",
                        cta_href=href,
                        course_id=str(row.get("id") or "") or None,
                    ),
                )
            )
            seen_links.add(href)

    for row in _fetch_curated_reference_resources():
        title = str(row.get("title") or "").strip()
        url = str(row.get("url") or "").strip()
        source_name = str(row.get("source_name") or "").strip()
        if not title or not url or url in seen_links:
            continue

        score = _keyword_overlap_score(
            topic_tokens,
            title,
            str(row.get("summary") or ""),
            str(row.get("topic_names") or ""),
            str(row.get("topic_keywords") or ""),
            source_name,
        )
        if score <= 0:
            continue

        bucket = _bucket_external_reference(row, score)
        if not bucket:
            continue

        summary = str(row.get("summary") or "").strip()
        provenance_note = str(row.get("provenance_note") or "").strip()
        reviewed_at = row.get("reviewed_at")
        buckets[bucket].append(
            (
                score,
                1,
                LessonReferenceItem(
                    kind="resource",
                    source_type="external",
                    title=title,
                    subtitle=summary or None,
                    reason="Nguồn ngoài đã được đội ngũ duyệt và bám sát chủ đề của bài học hiện tại.",
                    cta_label="Mở tài liệu",
                    cta_href=url,
                    source_name=source_name or None,
                    provenance_note=provenance_note or None,
                    reviewed_at=reviewed_at.isoformat() if hasattr(reviewed_at, "isoformat") else (str(reviewed_at) if reviewed_at else None),
                ),
            )
        )
        seen_links.add(url)

    available_intents: list[LessonReferenceIntent] = []
    for key in ("foundations", "read_more", "examples", "advanced"):
        if buckets.get(key):
            available_intents.append(key)  # type: ignore[arg-type]

    selected_items: list[LessonReferenceItem] = []
    if intent:
        selected_items = [
            item
            for _, _, item in sorted(
                buckets.get(intent, []),
                key=lambda value: (value[1], -value[0], value[2].title.lower()),
            )
        ][:LESSON_REFERENCE_LIMIT]
    else:
        for key in ("foundations", "read_more", "examples", "advanced"):
            sorted_items = sorted(
                buckets.get(key, []),
                key=lambda value: (value[1], -value[0], value[2].title.lower()),
            )
            selected_items.extend(item for _, _, item in sorted_items[:2])
        selected_items = selected_items[: LESSON_REFERENCE_LIMIT + 2]

    return LessonReferencesResponse(
        source_scope=(
            "internal_plus_curated_external"
            if any(item.source_type == "external" for item in selected_items)
            else "internal_only"
        ),
        intents=available_intents,
        items=selected_items,
    ).model_dump(mode="json")


def _fetch_attempt_context(quiz_id: str, attempt_id: str, user_id: str) -> dict[str, Any] | None:
    return fetch_one(
        """
        SELECT
            qa.id AS attempt_id,
            qa.quiz_id,
            qa.user_id,
            qa.score,
            qa.passed,
            qa.answers,
            q.title AS quiz_title,
            q.description AS quiz_description,
            q.passing_score,
            l.id AS lesson_id,
            l.title AS lesson_title,
            l.slug AS lesson_slug,
            m.id AS module_id,
            m.title AS module_title,
            c.id AS course_id,
            c.title AS course_title,
            c.slug AS course_slug
        FROM quiz_attempts qa
        JOIN quizzes q ON q.id = qa.quiz_id
        JOIN lessons l ON l.id = q.lesson_id
        JOIN modules m ON m.id = l.module_id
        JOIN courses c ON c.id = m.course_id
        WHERE qa.id = %s
          AND qa.quiz_id = %s
          AND qa.user_id = %s
        LIMIT 1
        """,
        (attempt_id, quiz_id, user_id),
    )


def _fetch_quiz_rows(quiz_id: str) -> list[dict[str, Any]]:
    return fetch_all(
        """
        SELECT
            qq.id AS question_id,
            qq.question_text,
            qq.explanation,
            qq.points,
            qq.sort AS question_sort,
            qa.id AS answer_id,
            qa.answer_text,
            qa.is_correct,
            qa.sort AS answer_sort
        FROM quiz_questions qq
        LEFT JOIN quiz_answers qa ON qa.question_id = qq.id
        WHERE qq.quiz_id = %s
        ORDER BY qq.sort ASC, qa.sort ASC
        """,
        (quiz_id,),
    )


def _group_quiz_rows(rows: list[dict[str, Any]], selected_answers: dict[str, Any]) -> list[dict[str, Any]]:
    grouped: dict[str, dict[str, Any]] = {}
    for row in rows:
        question_id = str(row.get("question_id") or "")
        if not question_id:
            continue
        question = grouped.setdefault(
            question_id,
            {
                "question_id": question_id,
                "question_text": str(row.get("question_text") or "").strip(),
                "explanation": str(row.get("explanation") or "").strip(),
                "points": int(row.get("points") or 1),
                "answers": [],
            },
        )
        answer_id = str(row.get("answer_id") or "").strip()
        if answer_id:
            question["answers"].append(
                {
                    "id": answer_id,
                    "answer_text": str(row.get("answer_text") or "").strip(),
                    "is_correct": bool(row.get("is_correct")),
                }
            )

    normalized_answers: dict[str, list[str]] = {}
    for question_id, value in selected_answers.items():
        if isinstance(value, list):
            normalized_answers[str(question_id)] = [str(item) for item in value]
        elif value is not None:
            normalized_answers[str(question_id)] = [str(value)]

    result: list[dict[str, Any]] = []
    for question in grouped.values():
        correct_answer_ids = [
            answer["id"] for answer in question["answers"] if bool(answer.get("is_correct"))
        ]
        selected_answer_ids = normalized_answers.get(question["question_id"], [])
        is_correct = (
            len(selected_answer_ids) == len(correct_answer_ids)
            and all(answer_id in correct_answer_ids for answer_id in selected_answer_ids)
            and all(answer_id in selected_answer_ids for answer_id in correct_answer_ids)
        )
        selected_answer_texts = [
            answer["answer_text"]
            for answer in question["answers"]
            if answer["id"] in selected_answer_ids
        ]
        correct_answer_texts = [
            answer["answer_text"]
            for answer in question["answers"]
            if answer["id"] in correct_answer_ids
        ]
        result.append(
            {
                **question,
                "selected_answer_ids": selected_answer_ids,
                "correct_answer_ids": correct_answer_ids,
                "selected_answer_texts": selected_answer_texts,
                "correct_answer_texts": correct_answer_texts,
                "is_correct": is_correct,
            }
        )
    return result


def _build_revisit_candidates(context: dict[str, Any], incorrect_questions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = [
        {
            "title": str(context.get("lesson_title") or "").strip(),
            "reason": "Bài quiz này gắn trực tiếp với lesson hiện tại, nên đây là nơi cần xem lại đầu tiên.",
            "cta_href": _lesson_url(str(context.get("course_slug") or ""), str(context.get("lesson_slug") or "")),
            "lesson_id": str(context.get("lesson_id") or "") or None,
            "module_id": str(context.get("module_id") or "") or None,
        }
    ]

    target_tokens = _topic_tokens(
        " ".join(str(item.get("question_text") or "") for item in incorrect_questions),
        " ".join(str(item.get("explanation") or "") for item in incorrect_questions),
    )
    siblings = fetch_all(
        """
        SELECT
            l.id AS lesson_id,
            l.title AS lesson_title,
            l.slug AS lesson_slug,
            COALESCE(l.content, '') AS lesson_content,
            m.id AS module_id,
            c.slug AS course_slug
        FROM lessons l
        JOIN modules m ON m.id = l.module_id
        JOIN courses c ON c.id = m.course_id
        WHERE m.id = %s
          AND l.id <> %s
          AND l.status = 'published'
        ORDER BY l.sort ASC
        """,
        (str(context.get("module_id") or ""), str(context.get("lesson_id") or "")),
    )
    ranked_siblings: list[tuple[int, dict[str, Any]]] = []
    for row in siblings:
        score = _keyword_overlap_score(
            target_tokens,
            str(row.get("lesson_title") or ""),
            _strip_html(str(row.get("lesson_content") or ""))[:600],
        )
        if score >= 2:
            ranked_siblings.append((score, row))

    for _, row in sorted(ranked_siblings, key=lambda value: value[0], reverse=True)[:2]:
        candidates.append(
            {
                "title": str(row.get("lesson_title") or "").strip(),
                "reason": "Bài học này cùng module và có liên hệ mạnh với các câu bạn vừa làm sai.",
                "cta_href": _lesson_url(str(row.get("course_slug") or ""), str(row.get("lesson_slug") or "")),
                "lesson_id": str(row.get("lesson_id") or "") or None,
                "module_id": str(row.get("module_id") or "") or None,
            }
        )
    return candidates[:3]


def _build_raw_clusters(incorrect_questions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    topic_map: dict[str, list[dict[str, Any]]] = defaultdict(list)
    fallback_clusters: list[dict[str, Any]] = []
    for question in incorrect_questions:
        tokens = _topic_tokens(
            str(question.get("question_text") or ""),
            str(question.get("explanation") or ""),
        )
        topic = tokens[0] if tokens else ""
        if topic:
            topic_map[topic].append(question)
        else:
            fallback_clusters.append(
                {
                    "topic": "",
                    "question_ids": [str(question.get("question_id") or "")],
                    "question_texts": [str(question.get("question_text") or "").strip()],
                    "seed_explanation": str(question.get("explanation") or "").strip(),
                }
            )

    clusters: list[dict[str, Any]] = []
    used_ids: set[str] = set()
    for topic, questions in topic_map.items():
        if len(questions) >= 2:
            clusters.append(
                {
                    "topic": topic,
                    "question_ids": [str(question.get("question_id") or "") for question in questions],
                    "question_texts": [str(question.get("question_text") or "").strip() for question in questions],
                    "seed_explanation": str(questions[0].get("explanation") or "").strip(),
                }
            )
            used_ids.update(str(question.get("question_id") or "") for question in questions)

    for question in incorrect_questions:
        question_id = str(question.get("question_id") or "")
        if question_id in used_ids:
            continue
        clusters.append(
            {
                "topic": "",
                "question_ids": [question_id],
                "question_texts": [str(question.get("question_text") or "").strip()],
                "seed_explanation": str(question.get("explanation") or "").strip(),
            }
        )
    clusters.extend(fallback_clusters)
    return clusters[:4]


def build_quiz_mistake_review(
    *,
    quiz_id: str,
    attempt_id: str,
    lesson_id: str | None,
    current_path: str | None,
    user_id: str,
    role: RoleType,
) -> tuple[dict[str, Any], int]:
    started = time.perf_counter()
    settings = get_settings()

    cached = get_cached_quiz_mistake_review(
        attempt_id=attempt_id,
        prompt_version=QUIZ_MISTAKE_REVIEW_PROMPT_VERSION,
        model=settings.openai_model,
    )
    if cached:
        return cached, int((time.perf_counter() - started) * 1000)

    attempt_context = _fetch_attempt_context(quiz_id, attempt_id, user_id)
    if not attempt_context:
        raise RuntimeError("Không tìm thấy lượt làm quiz phù hợp.")

    answers = attempt_context.get("answers")
    normalized_answers = answers if isinstance(answers, dict) else {}
    quiz_rows = _fetch_quiz_rows(quiz_id)
    questions = _group_quiz_rows(quiz_rows, normalized_answers)
    incorrect_questions = [question for question in questions if not bool(question.get("is_correct"))]

    effective_lesson_id = str(lesson_id or attempt_context.get("lesson_id") or "").strip() or None

    if not incorrect_questions:
        response = QuizMistakeReviewResponse(
            review_state="perfect_attempt",
            summary="Bạn đã làm đúng toàn bộ câu hỏi trong quiz này. Hãy tiếp tục sang bài tiếp theo hoặc dùng AI để ôn nhanh lại ý chính nếu muốn ghi nhớ lâu hơn.",
            mistake_clusters=[],
            concepts_to_review=[],
            lessons_to_revisit=[],
            recovery_plan=[
                "Ghi nhớ lại các ý chính trong lesson hiện tại.",
                "Chuyển sang bài tiếp theo khi bạn đã sẵn sàng.",
            ],
            follow_up_prompts=[
                "Tóm tắt lại lesson này cho tôi.",
                "Cho tôi 3 ý chính cần nhớ từ bài này.",
            ],
        ).model_dump(mode="json")
        save_cached_quiz_mistake_review(
            attempt_id=attempt_id,
            quiz_id=quiz_id,
            lesson_id=effective_lesson_id,
            prompt_version=QUIZ_MISTAKE_REVIEW_PROMPT_VERSION,
            model=settings.openai_model,
            review_state="perfect_attempt",
            payload=response,
        )
        return response, int((time.perf_counter() - started) * 1000)

    revisit_candidates = _build_revisit_candidates(attempt_context, incorrect_questions)
    raw_clusters = _build_raw_clusters(incorrect_questions)
    raw_concepts = [
        {
            "title": re.sub(r"\s+", " ", str(question.get("question_text") or "").strip())[:120],
            "reason": str(question.get("explanation") or "").strip()[:240]
            or "Bạn đã bỏ lỡ câu hỏi này, nên cần xem lại khái niệm liên quan.",
        }
        for question in incorrect_questions[:4]
    ]

    grounded_payload = {
        "quiz": {
            "id": str(attempt_context.get("quiz_id") or ""),
            "title": str(attempt_context.get("quiz_title") or "").strip(),
            "passing_score": int(attempt_context.get("passing_score") or 0),
            "score": int(float(attempt_context.get("score") or 0)),
            "passed": bool(attempt_context.get("passed")),
        },
        "course_context": {
            "course_id": str(attempt_context.get("course_id") or ""),
            "course_title": str(attempt_context.get("course_title") or "").strip(),
            "course_slug": str(attempt_context.get("course_slug") or "").strip(),
            "module_id": str(attempt_context.get("module_id") or ""),
            "module_title": str(attempt_context.get("module_title") or "").strip(),
            "lesson_id": str(attempt_context.get("lesson_id") or ""),
            "lesson_title": str(attempt_context.get("lesson_title") or "").strip(),
            "lesson_slug": str(attempt_context.get("lesson_slug") or "").strip(),
            "current_path": current_path,
        },
        "incorrect_questions": [
            {
                "question_id": str(question.get("question_id") or ""),
                "question_text": str(question.get("question_text") or "").strip(),
                "explanation": str(question.get("explanation") or "").strip(),
                "selected_answer_texts": question.get("selected_answer_texts") or [],
                "correct_answer_texts": question.get("correct_answer_texts") or [],
            }
            for question in incorrect_questions
        ],
        "raw_clusters": raw_clusters,
        "raw_concepts_to_review": raw_concepts,
        "revisit_candidates": revisit_candidates,
        "recovery_plan_seed": [
            "Xem lại explanation của các câu sai để xác định đúng điểm vướng.",
            "Ôn lại lesson hiện tại trước, sau đó mở thêm bài liên quan nếu còn chưa chắc.",
            "Làm lại quiz sau khi đã ôn các khái niệm vừa sai.",
        ],
    }

    instructions = (
        "You are Kognify AI Mistake Review. "
        "You will receive grounded quiz-attempt facts from the platform. "
        "Do not invent question results, scores, lessons, or concepts outside the provided payload. "
        "Return student-friendly Vietnamese JSON only. "
        "review_state must remain `has_mistakes`. "
        "Summarize the likely misunderstanding patterns, explain what to review next, and keep the tone practical. "
        "Use revisit_candidates exactly as the source for lessons_to_revisit and do not fabricate extra links. "
        "Keep mistake_clusters, concepts_to_review, lessons_to_revisit, and follow_up_prompts concise."
    )

    response_payload = _send_openai_request(
        {
            "model": settings.openai_model,
            "instructions": instructions,
            "input": _json_dump(grounded_payload),
            "store": False,
            "reasoning": {"effort": settings.openai_reasoning_effort},
            "text": {"format": QUIZ_MISTAKE_REVIEW_RESPONSE_FORMAT},
        }
    )

    parsed = _parse_json(_extract_output_text(response_payload))
    response = QuizMistakeReviewResponse(
        review_state="has_mistakes",
        summary=str(parsed.get("summary") or "").strip(),
        mistake_clusters=[
            QuizMistakeCluster(
                title=str(item.get("title") or "").strip(),
                description=str(item.get("description") or "").strip(),
                question_ids=[str(question_id).strip() for question_id in item.get("question_ids", []) if str(question_id).strip()],
            )
            for item in parsed.get("mistake_clusters", [])[:4]
            if str(item.get("title") or "").strip() and str(item.get("description") or "").strip()
        ],
        concepts_to_review=[
            QuizConceptToReview(
                title=str(item.get("title") or "").strip(),
                reason=str(item.get("reason") or "").strip(),
            )
            for item in parsed.get("concepts_to_review", [])[:4]
            if str(item.get("title") or "").strip() and str(item.get("reason") or "").strip()
        ],
        lessons_to_revisit=[
            QuizLessonRevisitItem(
                title=str(item.get("title") or "").strip(),
                reason=str(item.get("reason") or "").strip(),
                cta_href=str(item.get("cta_href") or "").strip(),
                lesson_id=str(item.get("lesson_id") or "").strip() or None,
                module_id=str(item.get("module_id") or "").strip() or None,
            )
            for item in parsed.get("lessons_to_revisit", [])[:3]
            if str(item.get("title") or "").strip()
            and str(item.get("reason") or "").strip()
            and str(item.get("cta_href") or "").strip()
        ],
        recovery_plan=[str(item).strip() for item in parsed.get("recovery_plan", []) if str(item).strip()][:4],
        follow_up_prompts=[str(item).strip() for item in parsed.get("follow_up_prompts", []) if str(item).strip()][
            :3
        ],
    ).model_dump(mode="json")

    save_cached_quiz_mistake_review(
        attempt_id=attempt_id,
        quiz_id=quiz_id,
        lesson_id=effective_lesson_id,
        prompt_version=QUIZ_MISTAKE_REVIEW_PROMPT_VERSION,
        model=settings.openai_model,
        review_state="has_mistakes",
        payload=response,
    )
    return response, int((time.perf_counter() - started) * 1000)
