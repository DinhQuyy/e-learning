from __future__ import annotations

import time
from typing import Any

from .chat_service import _extract_output_text, _json_dump, _parse_json, _send_openai_request
from .config import get_settings
from .models import (
    InstructorReviewCopilotResponse,
    InstructorReviewCopilotRequest,
    InstructorReviewSuggestionCriterion,
)

INSTRUCTOR_REVIEW_COPILOT_PROMPT_VERSION = "instructor-review-copilot-v1"

INSTRUCTOR_REVIEW_COPILOT_RESPONSE_FORMAT = {
    "type": "json_schema",
    "name": "instructor_review_copilot_response",
    "strict": True,
    "schema": {
        "type": "object",
        "properties": {
            "overall_summary": {"type": "string"},
            "proposed_final_feedback": {"type": "string"},
            "criteria": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "criterion_id": {"type": "string"},
                        "title": {"type": "string"},
                        "max_points": {"type": "number"},
                        "suggested_score": {"type": "number"},
                        "rationale": {"type": "string"},
                        "evidence_snippets": {"type": "array", "items": {"type": "string"}},
                        "caution_flag": {"anyOf": [{"type": "string"}, {"type": "null"}]},
                    },
                    "required": [
                        "criterion_id",
                        "title",
                        "max_points",
                        "suggested_score",
                        "rationale",
                        "evidence_snippets",
                        "caution_flag",
                    ],
                    "additionalProperties": False,
                },
            },
            "confidence": {"type": "string", "enum": ["low", "medium", "high"]},
            "caution_flags": {"type": "array", "items": {"type": "string"}},
        },
        "required": [
            "overall_summary",
            "proposed_final_feedback",
            "criteria",
            "confidence",
            "caution_flags",
        ],
        "additionalProperties": False,
    },
}


def build_instructor_review_copilot(
    payload: InstructorReviewCopilotRequest,
) -> tuple[dict[str, Any], int]:
    started = time.perf_counter()
    settings = get_settings()

    criteria_payload = [
        {
            "criterion_id": item.criterion_id,
            "title": item.title,
            "description": item.description,
            "max_points": item.max_points,
            "scoring_guidance": item.scoring_guidance,
        }
        for item in payload.rubric_criteria
    ]

    instructions = (
        "You are Kognify Instructor Review Copilot. "
        "You help instructors review assignment submissions with grounded, rubric-based suggestions. "
        "You must not invent platform facts, extra rubric criteria, or evidence not present in the provided submission. "
        "Score each criterion conservatively within its max_points. "
        "If the submission is weak or incomplete, say so clearly. "
        "Evidence snippets must quote or closely paraphrase short parts of the submission only. "
        "Caution flags should call out missing evidence, ambiguity, plagiarism risk signals, or weak alignment to the instructions when relevant. "
        "This output is advisory only for a human instructor. "
        "Return only valid JSON matching the required schema."
    )

    grounded_payload = {
        "prompt_version": INSTRUCTOR_REVIEW_COPILOT_PROMPT_VERSION,
        "course_title": payload.course_title,
        "lesson_title": payload.lesson_title,
        "assignment_title": payload.assignment_title,
        "assignment_instructions": payload.assignment_instructions,
        "lesson_content_summary": payload.lesson_content_summary,
        "submission_reference_url": payload.submission_reference_url,
        "submission_body": payload.submission_body,
        "rubric_criteria": criteria_payload,
    }

    response_payload = _send_openai_request(
        {
            "model": settings.openai_model,
            "instructions": instructions,
            "input": _json_dump(grounded_payload),
            "store": False,
            "reasoning": {"effort": settings.openai_reasoning_effort},
            "text": {"format": INSTRUCTOR_REVIEW_COPILOT_RESPONSE_FORMAT},
        }
    )

    raw_output = _extract_output_text(response_payload)
    parsed = _parse_json(raw_output)

    criteria = [
        InstructorReviewSuggestionCriterion(
            criterion_id=str(item.get("criterion_id") or "").strip(),
            title=str(item.get("title") or "").strip(),
            max_points=float(item.get("max_points") or 0),
            suggested_score=float(item.get("suggested_score") or 0),
            rationale=str(item.get("rationale") or "").strip(),
            evidence_snippets=[
                str(snippet).strip()
                for snippet in (item.get("evidence_snippets") or [])
                if str(snippet).strip()
            ][:4],
            caution_flag=str(item.get("caution_flag") or "").strip() or None,
        )
        for item in (parsed.get("criteria") or [])
        if str(item.get("criterion_id") or "").strip()
    ]

    confidence_raw = str(parsed.get("confidence") or "medium").strip().lower()
    confidence = confidence_raw if confidence_raw in {"low", "medium", "high"} else "medium"

    normalized = InstructorReviewCopilotResponse(
        overall_summary=str(parsed.get("overall_summary") or "").strip(),
        proposed_final_feedback=str(parsed.get("proposed_final_feedback") or "").strip(),
        criteria=criteria,
        confidence=confidence,
        caution_flags=[
            str(flag).strip() for flag in (parsed.get("caution_flags") or []) if str(flag).strip()
        ][:5],
    ).model_dump(mode="json")

    latency_ms = int((time.perf_counter() - started) * 1000)
    return normalized, latency_ms
