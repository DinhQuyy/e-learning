from __future__ import annotations

import json
import re
import unicodedata
from dataclasses import dataclass
from typing import Any, Callable

from .db import fetch_all, fetch_one
from .models import ReferenceItem, RoleType


def _strip_html(value: str | None) -> str:
    if not value:
        return ""
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", value)).strip()


def _format_duration(seconds: int | None) -> str:
    total_seconds = max(int(seconds or 0), 0)
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    if hours > 0:
        return f"{hours}h {minutes}m"
    return f"{minutes}m"


def _course_url(slug: str) -> str:
    return f"/courses/{slug}"


def _module_url(course_slug: str, module_id: str) -> str:
    return f"/courses/{course_slug}?module={module_id}#module-{module_id}"


def _lesson_url(course_slug: str, lesson_slug: str) -> str:
    return f"/learn/{course_slug}/{lesson_slug}"


def _build_acl(role: RoleType, user_id: str) -> tuple[str, list[Any]]:
    if role == "admin":
        return "TRUE", []
    if role == "student":
        return "c.status = 'published'", []
    return (
        """
        EXISTS (
            SELECT 1
            FROM courses_instructors ci
            WHERE ci.course_id = c.id
              AND ci.user_id = %s
        )
        """,
        [user_id],
    )


def _normalize_search_text(value: str | None) -> str:
    if not value:
        return ""

    normalized = unicodedata.normalize("NFKD", value)
    without_accents = "".join(char for char in normalized if not unicodedata.combining(char))
    lowered = without_accents.lower()
    return re.sub(r"[^a-z0-9]+", " ", lowered).strip()


def _search_tokens(value: str | None) -> list[str]:
    return [token for token in _normalize_search_text(value).split(" ") if token]


def _fetch_search_rows(role: RoleType, user_id: str) -> list[dict[str, Any]]:
    acl_sql, acl_params = _build_acl(role, user_id)
    return fetch_all(
        f"""
        SELECT
            c.id,
            c.title,
            c.slug,
            c.status,
            c.level,
            c.language,
            c.price,
            c.discount_price,
            c.total_lessons,
            c.total_duration,
            c.total_enrollments,
            c.average_rating,
            c.date_created,
            cat.name AS category_name,
            COALESCE(NULLIF(c.short_description, ''), c.description, '') AS summary,
            STRING_AGG(DISTINCT CONCAT_WS(' ', du.first_name, du.last_name), ', ')
                FILTER (WHERE du.id IS NOT NULL) AS instructors,
            STRING_AGG(DISTINCT NULLIF(TRIM(m.title), ''), ' || ')
                FILTER (WHERE m.id IS NOT NULL) AS module_titles,
            STRING_AGG(DISTINCT NULLIF(TRIM(l.title), ''), ' || ')
                FILTER (WHERE l.id IS NOT NULL) AS lesson_titles
        FROM courses c
        LEFT JOIN categories cat ON cat.id = c.category_id
        LEFT JOIN modules m ON m.course_id = c.id
        LEFT JOIN lessons l
            ON l.module_id = m.id
           AND (%s <> 'student' OR COALESCE(l.status, 'published') = 'published')
        LEFT JOIN courses_instructors ci ON ci.course_id = c.id
        LEFT JOIN directus_users du ON du.id = ci.user_id
        WHERE ({acl_sql})
        GROUP BY c.id, cat.name
        """,
        tuple([role, *acl_params]),
    )


def _score_course_match(query: str, row: dict[str, Any]) -> int:
    normalized_query = _normalize_search_text(query)
    if not normalized_query:
        return 0

    title_norm = _normalize_search_text(str(row.get("title") or ""))
    slug_norm = _normalize_search_text(str(row.get("slug") or ""))
    category_norm = _normalize_search_text(str(row.get("category_name") or ""))
    module_norm = _normalize_search_text(str(row.get("module_titles") or ""))
    lesson_norm = _normalize_search_text(str(row.get("lesson_titles") or ""))
    tokens = _search_tokens(normalized_query)

    if not any([title_norm, slug_norm, category_norm, module_norm, lesson_norm]):
        return 0

    score = 0
    if title_norm == normalized_query:
        score += 240
    if slug_norm == normalized_query:
        score += 220
    if normalized_query in title_norm:
        score += 150
    if normalized_query in slug_norm:
        score += 120
    if normalized_query in module_norm:
        score += 80
    if normalized_query in lesson_norm:
        score += 70
    if normalized_query in category_norm:
        score += 45
    if title_norm.startswith(normalized_query):
        score += 30
    if slug_norm.startswith(normalized_query):
        score += 18

    matched_tokens = 0
    for token in tokens:
        if token in title_norm:
            score += 20
            matched_tokens += 1
        elif token in slug_norm:
            score += 16
            matched_tokens += 1
        elif token in module_norm:
            score += 12
            matched_tokens += 1
        elif token in lesson_norm:
            score += 10
            matched_tokens += 1
        elif token in category_norm:
            score += 8
            matched_tokens += 1

    if tokens and matched_tokens == len(tokens):
        score += 35
    elif matched_tokens > 0:
        score += min(matched_tokens * 4, 16)

    if score > 0 and str(row.get("status") or "") == "published":
        score += 3

    return score


def _resolve_course_identifier(identifier: str, role: RoleType, user_id: str) -> dict[str, Any] | None:
    safe_identifier = identifier.strip()
    if not safe_identifier:
        return None

    acl_sql, acl_params = _build_acl(role, user_id)
    exact_match = fetch_one(
        f"""
        SELECT c.id, c.title, c.slug
        FROM courses c
        WHERE ({acl_sql})
          AND (
            c.id::text = %s
            OR LOWER(c.slug) = LOWER(%s)
          )
        LIMIT 1
        """,
        tuple([*acl_params, safe_identifier, safe_identifier]),
    )
    if exact_match:
        return exact_match

    ranked_rows = sorted(
        (
            (score, row)
            for row in _fetch_search_rows(role, user_id)
            for score in [_score_course_match(safe_identifier, row)]
            if score >= 90
        ),
        key=lambda item: (
            item[0],
            int(item[1].get("total_enrollments") or 0),
            float(item[1].get("average_rating") or 0),
        ),
        reverse=True,
    )
    if not ranked_rows:
        return None

    best_row = ranked_rows[0][1]
    return {
        "id": str(best_row["id"]),
        "title": str(best_row["title"]),
        "slug": str(best_row["slug"]),
    }


def derive_course_id_from_path(path: str | None, role: RoleType, user_id: str) -> str | None:
    safe_path = str(path or "").strip()
    if not safe_path:
        return None

    patterns = (
        r"^/courses/([^/?#]+)",
        r"^/learn/([^/?#]+)",
    )
    for pattern in patterns:
        match = re.match(pattern, safe_path)
        if not match:
            continue
        slug = match.group(1).strip()
        resolved = _resolve_course_identifier(slug, role, user_id)
        if resolved and resolved.get("id"):
            return str(resolved["id"])
    return None


def lookup_course_context(course_id: str | None, role: RoleType, user_id: str) -> dict[str, Any] | None:
    if not course_id:
        return None
    acl_sql, acl_params = _build_acl(role, user_id)
    row = fetch_one(
        f"""
        SELECT c.id, c.title, c.slug
        FROM courses c
        WHERE ({acl_sql})
          AND c.id = %s
        LIMIT 1
        """,
        tuple([*acl_params, course_id]),
    )
    if not row:
        return None
    return {
        "course_id": str(row["id"]),
        "course_title": str(row["title"]),
        "course_slug": str(row["slug"]),
    }


@dataclass(slots=True)
class ToolContext:
    user_id: str
    role: RoleType


@dataclass(slots=True)
class ToolResult:
    payload: dict[str, Any]
    references: list[ReferenceItem]


ToolExecutor = Callable[[dict[str, Any], ToolContext], ToolResult]


@dataclass(slots=True)
class ToolDefinition:
    name: str
    description: str
    parameters: dict[str, Any]
    executor: ToolExecutor
    strict: bool = True

    def to_openai_schema(self) -> dict[str, Any]:
        return {
            "type": "function",
            "name": self.name,
            "description": self.description,
            "parameters": self.parameters,
            "strict": self.strict,
        }


def _search_courses(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    query = str(args.get("query") or "").strip()
    limit = min(max(int(args.get("limit") or 5), 1), 5)
    if not query:
        return ToolResult(payload={"query": query, "matches": []}, references=[])

    ranked_rows = sorted(
        (
            (score, row)
            for row in _fetch_search_rows(ctx.role, ctx.user_id)
            for score in [_score_course_match(query, row)]
            if score > 0
        ),
        key=lambda item: (
            item[0],
            int(item[1].get("total_enrollments") or 0),
            float(item[1].get("average_rating") or 0),
            str(item[1].get("date_created") or ""),
        ),
        reverse=True,
    )[:limit]

    matches: list[dict[str, Any]] = []
    references: list[ReferenceItem] = []
    for _, row in ranked_rows:
        title = str(row.get("title") or "").strip()
        slug = str(row.get("slug") or "").strip()
        if not title or not slug:
            continue
        subtitle_parts = [
            str(row.get("category_name") or "").strip(),
            str(row.get("level") or "").strip(),
            str(row.get("status") or "").strip(),
        ]
        subtitle = " | ".join(part for part in subtitle_parts if part)
        description = _strip_html(str(row.get("summary") or ""))[:220] or None
        matches.append(
            {
                "id": str(row["id"]),
                "title": title,
                "slug": slug,
                "status": str(row.get("status") or ""),
                "level": str(row.get("level") or ""),
                "category": str(row.get("category_name") or ""),
                "price": float(row.get("price") or 0),
                "discount_price": (
                    float(row["discount_price"]) if row.get("discount_price") is not None else None
                ),
                "total_lessons": int(row.get("total_lessons") or 0),
                "total_duration": int(row.get("total_duration") or 0),
                "total_enrollments": int(row.get("total_enrollments") or 0),
                "average_rating": float(row.get("average_rating") or 0),
                "instructors": str(row.get("instructors") or ""),
                "summary": description or "",
                "url": _course_url(slug),
            }
        )
        references.append(
            ReferenceItem(
                kind="course",
                id=str(row["id"]),
                title=title,
                url=_course_url(slug),
                subtitle=subtitle or None,
                description=description,
            )
        )

    return ToolResult(
        payload={
            "query": query,
            "match_count": len(matches),
            "matches": matches,
        },
        references=references,
    )


def _get_course_details(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    identifier = str(args.get("course_id_or_slug") or "").strip()
    if not identifier:
        return ToolResult(payload={"course": None}, references=[])

    resolved = _resolve_course_identifier(identifier, ctx.role, ctx.user_id)
    if not resolved:
        return ToolResult(payload={"course": None}, references=[])

    acl_sql, acl_params = _build_acl(ctx.role, ctx.user_id)
    row = fetch_one(
        f"""
        SELECT
            c.id,
            c.title,
            c.slug,
            c.status,
            c.level,
            c.language,
            c.price,
            c.discount_price,
            c.total_lessons,
            c.total_duration,
            c.total_enrollments,
            c.average_rating,
            c.is_featured,
            c.date_created,
            c.date_updated,
            cat.name AS category_name,
            COALESCE(c.short_description, '') AS short_description,
            COALESCE(c.description, '') AS description,
            COALESCE(c.requirements::jsonb, '[]'::jsonb) AS requirements,
            COALESCE(c.what_you_learn::jsonb, '[]'::jsonb) AS what_you_learn,
            COALESCE(c.target_audience::jsonb, '[]'::jsonb) AS target_audience,
            STRING_AGG(DISTINCT CONCAT_WS(' ', du.first_name, du.last_name), ', ')
                FILTER (WHERE du.id IS NOT NULL) AS instructors
        FROM courses c
        LEFT JOIN categories cat ON cat.id = c.category_id
        LEFT JOIN courses_instructors ci ON ci.course_id = c.id
        LEFT JOIN directus_users du ON du.id = ci.user_id
        WHERE ({acl_sql})
          AND c.id = %s
        GROUP BY c.id, cat.name
        LIMIT 1
        """,
        tuple([*acl_params, resolved["id"]]),
    )
    if not row:
        return ToolResult(payload={"course": None}, references=[])

    summary = _strip_html(str(row.get("short_description") or row.get("description") or ""))[:260]
    course = {
        "id": str(row["id"]),
        "title": str(row["title"]),
        "slug": str(row["slug"]),
        "status": str(row.get("status") or ""),
        "category": str(row.get("category_name") or ""),
        "level": str(row.get("level") or ""),
        "language": str(row.get("language") or ""),
        "price": float(row.get("price") or 0),
        "discount_price": float(row["discount_price"]) if row.get("discount_price") is not None else None,
        "total_lessons": int(row.get("total_lessons") or 0),
        "total_duration": int(row.get("total_duration") or 0),
        "total_enrollments": int(row.get("total_enrollments") or 0),
        "average_rating": float(row.get("average_rating") or 0),
        "is_featured": bool(row.get("is_featured")),
        "date_created": str(row.get("date_created") or ""),
        "date_updated": str(row.get("date_updated") or ""),
        "summary": summary,
        "description": _strip_html(str(row.get("description") or ""))[:1200],
        "requirements": row.get("requirements") or [],
        "what_you_learn": row.get("what_you_learn") or [],
        "target_audience": row.get("target_audience") or [],
        "instructors": str(row.get("instructors") or ""),
        "url": _course_url(str(row["slug"])),
    }
    reference = ReferenceItem(
        kind="course",
        id=course["id"],
        title=course["title"],
        url=course["url"],
        subtitle=" | ".join(part for part in [course["category"], course["level"], course["status"]] if part) or None,
        description=summary or None,
    )
    return ToolResult(payload={"course": course}, references=[reference])


def _get_course_outline(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    identifier = str(args.get("course_id_or_slug") or "").strip()
    if not identifier:
        return ToolResult(payload={"course": None, "modules": []}, references=[])

    resolved = _resolve_course_identifier(identifier, ctx.role, ctx.user_id)
    if not resolved:
        return ToolResult(payload={"course": None, "modules": []}, references=[])

    course_id = str(resolved["id"])
    course_title = str(resolved["title"])
    course_slug = str(resolved["slug"])

    acl_sql, acl_params = _build_acl(ctx.role, ctx.user_id)
    rows = fetch_all(
        f"""
        SELECT
            c.id AS course_id,
            c.title AS course_title,
            c.slug AS course_slug,
            m.id AS module_id,
            m.title AS module_title,
            m.description AS module_description,
            m.sort AS module_sort,
            l.id AS lesson_id,
            l.title AS lesson_title,
            l.slug AS lesson_slug,
            l.duration AS lesson_duration,
            l.type AS lesson_type,
            l.is_free AS lesson_is_free,
            l.status AS lesson_status,
            l.sort AS lesson_sort
        FROM courses c
        JOIN modules m ON m.course_id = c.id
        LEFT JOIN lessons l ON l.module_id = m.id
        WHERE ({acl_sql})
          AND c.id = %s
          AND (%s <> 'student' OR COALESCE(l.status, 'published') = 'published')
        ORDER BY m.sort ASC, l.sort ASC
        """,
        tuple([*acl_params, course_id, ctx.role]),
    )

    modules: list[dict[str, Any]] = []
    module_index: dict[str, dict[str, Any]] = {}
    references: list[ReferenceItem] = [
        ReferenceItem(
            kind="course",
            id=course_id,
            title=course_title,
            url=_course_url(course_slug),
            subtitle="Course outline",
            description=None,
        )
    ]
    lesson_reference_count = 0

    for row in rows:
        module_id = str(row.get("module_id") or "").strip()
        if not module_id:
            continue
        module = module_index.get(module_id)
        if module is None:
            module = {
                "id": module_id,
                "title": str(row.get("module_title") or "").strip(),
                "description": _strip_html(str(row.get("module_description") or ""))[:220],
                "sort": int(row.get("module_sort") or 0),
                "url": _module_url(course_slug, module_id),
                "lessons": [],
            }
            module_index[module_id] = module
            modules.append(module)
            references.append(
                ReferenceItem(
                    kind="module",
                    id=module_id,
                    title=module["title"] or "Module",
                    url=module["url"],
                    subtitle=course_title,
                    description=module["description"] or None,
                )
            )

        lesson_id = str(row.get("lesson_id") or "").strip()
        lesson_slug = str(row.get("lesson_slug") or "").strip()
        lesson_title = str(row.get("lesson_title") or "").strip()
        if not lesson_id or not lesson_slug or not lesson_title:
            continue

        lesson = {
            "id": lesson_id,
            "title": lesson_title,
            "slug": lesson_slug,
            "duration": int(row.get("lesson_duration") or 0),
            "duration_label": _format_duration(int(row.get("lesson_duration") or 0)),
            "type": str(row.get("lesson_type") or ""),
            "is_free": bool(row.get("lesson_is_free")),
            "status": str(row.get("lesson_status") or ""),
            "sort": int(row.get("lesson_sort") or 0),
            "url": _lesson_url(course_slug, lesson_slug),
        }
        module["lessons"].append(lesson)
        if lesson_reference_count < 6:
            references.append(
                ReferenceItem(
                    kind="lesson",
                    id=lesson_id,
                    title=lesson_title,
                    url=lesson["url"],
                    subtitle=module["title"] or course_title,
                    description=lesson["duration_label"],
                )
            )
            lesson_reference_count += 1

    payload = {
        "course": {
            "id": course_id,
            "title": course_title,
            "slug": course_slug,
            "url": _course_url(course_slug),
        },
        "modules": modules,
    }
    return ToolResult(payload=payload, references=references)


TOOL_DEFINITIONS: tuple[ToolDefinition, ...] = (
    ToolDefinition(
        name="search_courses",
        description="Search accessible courses by title, category, module title, or lesson title.",
        parameters={
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "limit": {
                    "anyOf": [
                        {"type": "integer", "minimum": 1, "maximum": 5},
                        {"type": "null"},
                    ]
                },
            },
            "required": ["query", "limit"],
            "additionalProperties": False,
        },
        executor=_search_courses,
    ),
    ToolDefinition(
        name="get_course_details",
        description="Get course metadata, pricing, rating, instructor, and summary by course id or slug.",
        parameters={
            "type": "object",
            "properties": {
                "course_id_or_slug": {"type": "string"},
            },
            "required": ["course_id_or_slug"],
            "additionalProperties": False,
        },
        executor=_get_course_details,
    ),
    ToolDefinition(
        name="get_course_outline",
        description="Get course syllabus with modules and lessons by course id or slug.",
        parameters={
            "type": "object",
            "properties": {
                "course_id_or_slug": {"type": "string"},
            },
            "required": ["course_id_or_slug"],
            "additionalProperties": False,
        },
        executor=_get_course_outline,
    ),
)

TOOL_DEFINITION_MAP = {tool.name: tool for tool in TOOL_DEFINITIONS}


def list_openai_tools() -> list[dict[str, Any]]:
    return [tool.to_openai_schema() for tool in TOOL_DEFINITIONS]


def execute_tool(name: str, arguments: dict[str, Any], context: ToolContext) -> ToolResult:
    tool = TOOL_DEFINITION_MAP.get(name)
    if tool is None:
        raise ValueError(f"Unsupported tool: {name}")
    return tool.executor(arguments, context)


def serialize_tool_payload(payload: dict[str, Any]) -> str:
    return json.dumps(payload, ensure_ascii=False)
