from __future__ import annotations

import hashlib
import json
import time
from typing import Any

from .chat_service import _extract_output_text, _json_dump, _parse_json, _send_openai_request
from .config import get_settings
from .models import CourseAdvisorResponse, RoleType
from .store import get_cached_course_advisor, save_cached_course_advisor
from .tool_registry import ToolContext, execute_tool

COURSE_ADVISOR_PROMPT_VERSION = "course-advisor-v1"

COURSE_ADVISOR_RESPONSE_FORMAT = {
    "type": "json_schema",
    "name": "course_advisor_response",
    "strict": True,
    "schema": {
        "type": "object",
        "properties": {
            "fit_summary": {"type": "string"},
            "prerequisites_summary": {"type": "string"},
            "target_audience_summary": {"type": "string"},
            "quick_syllabus": {
                "type": "array",
                "items": {"type": "string"},
            },
            "follow_up_prompts": {
                "type": "array",
                "items": {"type": "string"},
            },
        },
        "required": [
            "fit_summary",
            "prerequisites_summary",
            "target_audience_summary",
            "quick_syllabus",
            "follow_up_prompts",
        ],
        "additionalProperties": False,
    },
}


def _course_advisor_cache_payload(course: dict[str, Any], modules: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "course": {
            "id": course.get("id"),
            "title": course.get("title"),
            "slug": course.get("slug"),
            "status": course.get("status"),
            "category": course.get("category"),
            "level": course.get("level"),
            "language": course.get("language"),
            "price": course.get("price"),
            "discount_price": course.get("discount_price"),
            "summary": course.get("summary"),
            "description": course.get("description"),
            "requirements": course.get("requirements") or [],
            "what_you_learn": course.get("what_you_learn") or [],
            "target_audience": course.get("target_audience") or [],
            "instructors": course.get("instructors"),
            "total_lessons": course.get("total_lessons"),
            "total_duration": course.get("total_duration"),
            "total_enrollments": course.get("total_enrollments"),
            "average_rating": course.get("average_rating"),
            "url": course.get("url"),
        },
        "modules": [
            {
                "id": module.get("id"),
                "title": module.get("title"),
                "description": module.get("description"),
                "lessons": [
                    {
                        "id": lesson.get("id"),
                        "title": lesson.get("title"),
                        "type": lesson.get("type"),
                        "duration_label": lesson.get("duration_label"),
                    }
                    for lesson in (module.get("lessons") or [])
                ][:8],
            }
            for module in modules
        ],
    }


def _course_advisor_content_hash(payload: dict[str, Any]) -> str:
    canonical = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def build_course_advisor(
    *,
    course_id: str,
    user_id: str,
    role: RoleType,
    current_path: str | None,
) -> tuple[dict[str, Any], int]:
    started = time.perf_counter()
    settings = get_settings()
    tool_context = ToolContext(user_id=user_id, role=role)

    details_result = execute_tool("get_course_details", {"course_id_or_slug": course_id}, tool_context)
    outline_result = execute_tool("get_course_outline", {"course_id_or_slug": course_id}, tool_context)

    course = details_result.payload.get("course")
    modules = outline_result.payload.get("modules") or []
    if not isinstance(course, dict):
        response = CourseAdvisorResponse(
            source_state="metadata_only",
            fit_summary="Không tìm thấy khóa học phù hợp trong hệ thống hiện tại.",
            prerequisites_summary="Hiện chưa có đủ dữ liệu tiên quyết để phân tích.",
            target_audience_summary="Hiện chưa xác định được đối tượng phù hợp.",
            quick_syllabus=[],
            follow_up_prompts=[],
        ).model_dump(mode="json")
        return response, int((time.perf_counter() - started) * 1000)

    cache_payload = _course_advisor_cache_payload(
        course,
        modules if isinstance(modules, list) else [],
    )
    content_hash = _course_advisor_content_hash(cache_payload)
    normalized_course_id = str(course.get("id") or course_id)
    source_state = (
        "full_course_context"
        if isinstance(modules, list) and any(module.get("lessons") for module in modules if isinstance(module, dict))
        else "metadata_only"
    )

    cached = get_cached_course_advisor(
        course_id=normalized_course_id,
        content_hash=content_hash,
        prompt_version=COURSE_ADVISOR_PROMPT_VERSION,
        model=settings.openai_model,
    )
    if cached:
        return cached, int((time.perf_counter() - started) * 1000)

    instructions = (
        "You are Kognify AI Course Advisor. "
        "Your job is to help a learner decide whether a course fits them, what they should know first, who benefits most, and what the course covers quickly. "
        "You must stay grounded in the provided course metadata, learning outcomes, requirements, target audience, modules, and lesson titles. "
        "Do not invent prerequisites, outcomes, or course promises that are not supported by the provided payload. "
        "Use Vietnamese by default. Keep each section concise, practical, and decision-oriented. "
        "fit_summary should explain who this course fits and the expected learner level. "
        "prerequisites_summary should explain what a learner should know first, or clearly say there are no strong prerequisites if that is what the data suggests. "
        "target_audience_summary should describe who benefits most from the course, grounded in target audience and learning outcomes. "
        "quick_syllabus should contain 3 to 6 short, ordered bullets summarizing major modules or themes. "
        "follow_up_prompts should contain up to 3 short questions for continuing in chat."
    )

    grounded_payload = {
        "prompt_version": COURSE_ADVISOR_PROMPT_VERSION,
        "current_path": current_path,
        "source_state": source_state,
        **cache_payload,
    }

    response_payload = _send_openai_request(
        {
            "model": settings.openai_model,
            "instructions": instructions,
            "input": _json_dump(grounded_payload),
            "store": False,
            "reasoning": {"effort": settings.openai_reasoning_effort},
            "text": {"format": COURSE_ADVISOR_RESPONSE_FORMAT},
        }
    )

    raw_output = _extract_output_text(response_payload)
    parsed = _parse_json(raw_output)
    response = CourseAdvisorResponse(
        source_state=source_state,
        fit_summary=str(parsed.get("fit_summary") or "").strip(),
        prerequisites_summary=str(parsed.get("prerequisites_summary") or "").strip(),
        target_audience_summary=str(parsed.get("target_audience_summary") or "").strip(),
        quick_syllabus=[
            str(item).strip() for item in (parsed.get("quick_syllabus") or []) if str(item).strip()
        ][:6],
        follow_up_prompts=[
            str(item).strip() for item in (parsed.get("follow_up_prompts") or []) if str(item).strip()
        ][:3],
    ).model_dump(mode="json")

    save_cached_course_advisor(
        course_id=normalized_course_id,
        content_hash=content_hash,
        prompt_version=COURSE_ADVISOR_PROMPT_VERSION,
        model=settings.openai_model,
        source_state=source_state,
        payload=response,
    )

    return response, int((time.perf_counter() - started) * 1000)
