from __future__ import annotations

import hashlib
import json
import time
import unicodedata
from typing import Any

import httpx

from .config import get_settings
from .models import ChatResponse, LessonCommonPitfall, LessonStudyResponse, RoleType
from .store import get_cached_lesson_study, save_cached_lesson_study
from .tool_registry import (
    ToolContext,
    derive_course_id_from_path,
    execute_tool,
    list_openai_tools,
    lookup_course_context,
    lookup_lesson_context,
    lookup_lesson_context_by_id,
    serialize_tool_payload,
)

OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"
LESSON_STUDY_PROMPT_VERSION = "lesson-study-v4"
QUIZ_RESTRICTED_POLICY_ANSWER = (
    "Trong lúc bạn đang làm quiz, AI không thể cung cấp đáp án, kiểm tra lựa chọn đúng hay sai, "
    "hoặc hướng dẫn giải theo cách làm lộ đáp án. Tôi chỉ có thể hỗ trợ cách nộp bài, điều hướng, "
    "thời gian và nơi xem lại sau khi nộp."
)
QUIZ_RESTRICTED_POLICY_SUGGESTIONS = [
    "Làm sao để nộp bài?",
    "Tôi còn bao nhiêu lượt làm?",
    "Sau khi nộp tôi xem lại ở đâu?",
]

CHAT_RESPONSE_FORMAT = {
    "type": "json_schema",
    "name": "chat_response",
    "strict": True,
    "schema": {
        "type": "object",
        "properties": {
            "answer": {"type": "string"},
            "suggested_questions": {
                "type": "array",
                "items": {"type": "string"},
            },
        },
        "required": ["answer", "suggested_questions"],
        "additionalProperties": False,
    },
}

LESSON_STUDY_RESPONSE_FORMAT = {
    "type": "json_schema",
    "name": "lesson_study_response",
    "strict": True,
    "schema": {
        "type": "object",
        "properties": {
            "summary": {"type": "string"},
            "key_points": {"type": "array", "items": {"type": "string"}},
            "likely_misunderstandings": {"type": "array", "items": {"type": "string"}},
            "common_pitfalls": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "misunderstanding": {"type": "string"},
                        "correction": {"type": "string"},
                    },
                    "required": ["misunderstanding", "correction"],
                    "additionalProperties": False,
                },
            },
            "self_check_questions": {"type": "array", "items": {"type": "string"}},
            "simple_explanation": {"type": "string"},
            "example_explanation": {"type": "string"},
            "study_notes": {"type": "array", "items": {"type": "string"}},
            "follow_up_prompts": {"type": "array", "items": {"type": "string"}},
        },
        "required": [
            "summary",
            "key_points",
            "likely_misunderstandings",
            "common_pitfalls",
            "self_check_questions",
            "simple_explanation",
            "example_explanation",
            "study_notes",
            "follow_up_prompts",
        ],
        "additionalProperties": False,
    },
}


class ChatServiceError(RuntimeError):
    pass


def _json_dump(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False)


def _parse_json(value: str) -> dict[str, Any]:
    candidate = value.strip()
    if candidate.startswith("```"):
        candidate = candidate.split("\n", 1)[-1]
        if candidate.endswith("```"):
            candidate = candidate[:-3]
        candidate = candidate.strip()

    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        start = candidate.find("{")
        end = candidate.rfind("}")
        if start != -1 and end != -1 and end > start:
            return json.loads(candidate[start : end + 1])
        raise


def _normalize_match_text(value: str) -> str:
    lowered = str(value or "").strip().lower()
    normalized = unicodedata.normalize("NFKD", lowered)
    without_marks = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    return " ".join(without_marks.split())


def _contains_any(text: str, phrases: list[str]) -> bool:
    return any(phrase in text for phrase in phrases)


def _build_quiz_restricted_response(answer: str, suggestions: list[str] | None = None) -> dict[str, Any]:
    return ChatResponse(
        answer=answer,
        references=[],
        suggested_questions=(suggestions or QUIZ_RESTRICTED_POLICY_SUGGESTIONS)[:3],
    ).model_dump(mode="json")


def _maybe_handle_quiz_restricted(message: str) -> dict[str, Any]:
    normalized = _normalize_match_text(message)

    blocked_patterns = [
        "dap an",
        "tra loi dung",
        "tra loi la gi",
        "chon dap an",
        "lua chon nay dung",
        "co dung khong",
        "kiem tra dap an",
        "giai cau",
        "giai giup",
        "lam ho",
        "goi y tung buoc",
        "tung buoc",
        "step by step",
        "hint",
        "goi y dap an",
        "cho toi biet",
        "chi toi cach lam bai nay",
    ]
    safe_submit_patterns = ["nop bai", "submit", "ket thuc bai", "hoan thanh quiz"]
    safe_attempt_patterns = ["con bao nhieu luot", "con may luot", "bao nhieu luot", "attempt", "luot lam"]
    safe_time_patterns = [
        "con bao nhieu thoi gian",
        "timer",
        "dong ho",
        "bao nhieu phut",
        "bao nhieu giay",
        "thoi gian",
        "cau tiep",
        "cau truoc",
        "dieu huong",
        "chuyen cau",
        "dinh dang",
        "chon nhieu",
        "chon mot",
        "true false",
    ]
    safe_review_patterns = [
        "sau khi nop",
        "xem lai o dau",
        "xem ket qua o dau",
        "review o dau",
        "xem lai bai",
        "sau khi gui",
    ]

    if _contains_any(normalized, blocked_patterns):
        return _build_quiz_restricted_response(QUIZ_RESTRICTED_POLICY_ANSWER)

    if _contains_any(normalized, safe_submit_patterns):
        return _build_quiz_restricted_response(
            "Khi đã hoàn tất, bạn có thể dùng nút nộp bài ở phần quiz hiện tại. "
            "Hãy kiểm tra lại các câu đã chọn trước khi nộp vì AI không thể xác nhận đáp án đúng hay sai trong lúc làm bài.",
            [
                "Tôi còn bao nhiêu lượt làm?",
                "Sau khi nộp tôi xem lại ở đâu?",
                "Nếu hết giờ thì bài có tự nộp không?",
            ],
        )

    if _contains_any(normalized, safe_attempt_patterns):
        return _build_quiz_restricted_response(
            "Số lượt còn lại được hiển thị ngay trong khung quiz của bạn. "
            "Hãy xem badge lượt làm ở đầu phần quiz để biết bạn còn bao nhiêu lượt trước khi nộp.",
            [
                "Làm sao để nộp bài?",
                "Sau khi nộp tôi xem lại ở đâu?",
                "Nếu hết giờ thì bài có tự nộp không?",
            ],
        )

    if _contains_any(normalized, safe_time_patterns):
        return _build_quiz_restricted_response(
            "Bạn có thể theo dõi đồng hồ và phần tiến độ ngay trên khung quiz hiện tại. "
            "Trong lúc làm bài, bạn vẫn có thể di chuyển giữa các câu hỏi và chọn hoặc bỏ chọn đáp án theo định dạng của từng câu.",
            [
                "Nếu hết giờ thì bài có tự nộp không?",
                "Làm sao để nộp bài?",
                "Sau khi nộp tôi xem lại ở đâu?",
            ],
        )

    if _contains_any(normalized, safe_review_patterns):
        return _build_quiz_restricted_response(
            "Sau khi nộp bài, bạn sẽ thấy phần kết quả ngay trên trang quiz hiện tại. "
            "Nếu có câu sai, bạn có thể dùng Phân tích lỗi AI để xem lại khái niệm cần ôn và bài học liên quan.",
            [
                "Làm sao để nộp bài?",
                "Tôi còn bao nhiêu lượt làm?",
                "Phân tích lỗi AI giúp gì cho tôi sau khi nộp?",
            ],
        )

    if "het gio" in normalized or "tu nop" in normalized:
        return _build_quiz_restricted_response(
            "Nếu quiz có giới hạn thời gian, hãy theo dõi đồng hồ ở phần đầu khung làm bài. "
            "Khi thời gian kết thúc, hệ thống sẽ xử lý bài theo cơ chế của quiz hiện tại.",
            [
                "Làm sao để nộp bài?",
                "Sau khi nộp tôi xem lại ở đâu?",
                "Tôi còn bao nhiêu lượt làm?",
            ],
        )

    return _build_quiz_restricted_response(QUIZ_RESTRICTED_POLICY_ANSWER)


def _build_instructions(
    role: RoleType,
    surface: str | None,
    current_course: dict[str, Any] | None,
    current_lesson: dict[str, Any] | None,
) -> str:
    surface_note = "Current AI surface: global chat."
    if surface == "dashboard_coach":
        surface_note = (
            "Current AI surface: dashboard coach. "
            "The user may ask why a next-action suggestion was shown or how to use the platform."
        )
    elif surface == "lesson_study":
        surface_note = (
            "Current AI surface: lesson study assistant. "
            "Prioritize the current lesson context when the user refers to 'bai nay' or asks for deep explanation."
        )
    elif surface == "course_advisor":
        surface_note = (
            "Current AI surface: course advisor. "
            "Prioritize helping the user evaluate course fit, prerequisites, target audience, and syllabus coverage."
        )
    elif surface == "quiz_mistake_review":
        surface_note = (
            "Current AI surface: quiz mistake review. "
            "Prioritize explaining why the user missed quiz questions and how to review the related lesson safely."
        )
    elif surface == "quiz_restricted":
        surface_note = (
            "Current AI surface: quiz restricted mode. "
            "The user is in an active assessment. Do not help solve the quiz or reveal answers."
        )

    context_note = "Current page course context: none."
    if current_course:
        context_note = (
            "Current page course context is available. "
            f"Use course id `{current_course['course_id']}` when the user says 'khoa nay', "
            f"'course nay', or refers to the current page course. "
            f"Context: {_json_dump(current_course)}"
        )

    lesson_context_note = "Current page lesson context: none."
    if current_lesson:
        lesson_context_note = (
            "Current page lesson context is available. "
            f"Use lesson id `{current_lesson['lesson_id']}` when the user says 'bai nay', "
            f"'lesson nay', or refers to the current lesson page. "
            f"Context: {_json_dump(current_lesson)}"
        )

    return (
        "You are Kognify AI, a versatile Vietnamese-first assistant. "
        "You may answer general questions directly with model knowledge when the user asks for broad knowledge, brainstorming, writing help, or explanations not tied to platform data. "
        "When the user asks about this platform's courses, modules, lessons, pricing, status, instructors, syllabus, or lesson content, use the provided tools and ground the answer in tool output. "
        "If the user asks to summarize, explain, analyze, critique, compare, or extract insights from a lesson, call the lesson-content tool before answering. "
        "Do not invent course facts, lesson counts, pricing, status, instructors, or lesson content. "
        "If the user asks about a course and there are multiple plausible matches, ask a concise clarifying question. "
        "If the user asks about a lesson and there are multiple plausible matches, ask a concise clarifying question. "
        "If no data is found, say so directly. "
        "Use Vietnamese by default, but mirror the user's language when clearly different. "
        "Never mention internal tool names. "
        f"The signed-in user role is `{role}`. "
        f"{surface_note} "
        f"{context_note} "
        f"{lesson_context_note} "
        "Return only valid JSON with this shape: "
        '{"answer":"string","suggested_questions":["string"]}. '
        "Suggested questions should be short follow-ups grounded in tool results. "
        "Keep suggested_questions to at most 3 items."
    )


def _lesson_study_cache_payload(lesson: dict[str, Any]) -> dict[str, Any]:
    return {
        "lesson": {
            "id": lesson.get("id"),
            "title": lesson.get("title"),
            "type": lesson.get("type"),
            "duration_label": lesson.get("duration_label"),
            "course": lesson.get("course"),
            "module": lesson.get("module"),
            "content_text": str(lesson.get("content_text") or "").strip(),
            "content_word_count": int(lesson.get("content_word_count") or 0),
        }
    }


def _lesson_study_content_hash(payload: dict[str, Any]) -> str:
    canonical = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _parse_cached_lesson_study(payload: Any) -> dict[str, Any] | None:
    if not isinstance(payload, dict):
        return None

    required_fields = {
        "source_state",
        "summary",
        "key_points",
        "likely_misunderstandings",
        "common_pitfalls",
        "self_check_questions",
        "simple_explanation",
        "example_explanation",
        "study_notes",
        "follow_up_prompts",
    }
    if not required_fields.issubset(payload.keys()):
        return None

    try:
        return LessonStudyResponse.model_validate(payload).model_dump(mode="json")
    except Exception:
        return None


def _extract_tool_calls(response_payload: dict[str, Any]) -> list[dict[str, str]]:
    calls: list[dict[str, str]] = []
    for item in response_payload.get("output", []) or []:
        if not isinstance(item, dict) or item.get("type") != "function_call":
            continue
        name = str(item.get("name") or "").strip()
        call_id = str(item.get("call_id") or item.get("id") or "").strip()
        arguments = item.get("arguments")
        if name and call_id:
            calls.append(
                {
                    "name": name,
                    "call_id": call_id,
                    "arguments": arguments if isinstance(arguments, str) else _json_dump(arguments or {}),
                }
            )
    return calls


def _extract_output_text(response_payload: dict[str, Any]) -> str:
    output_text = response_payload.get("output_text")
    if isinstance(output_text, str) and output_text.strip():
        return output_text.strip()

    parts: list[str] = []
    for item in response_payload.get("output", []) or []:
        if not isinstance(item, dict):
            continue
        if item.get("type") == "message":
            for content in item.get("content", []) or []:
                if not isinstance(content, dict):
                    continue
                text = content.get("text")
                if isinstance(text, str) and text.strip():
                    parts.append(text.strip())
        text = item.get("text")
        if isinstance(text, str) and text.strip():
            parts.append(text.strip())
    return "\n".join(parts).strip()


def _extract_usage(response_payload: dict[str, Any]) -> tuple[int | None, int | None]:
    usage = response_payload.get("usage")
    if not isinstance(usage, dict):
        return None, None
    input_tokens = usage.get("input_tokens")
    output_tokens = usage.get("output_tokens")
    return (
        int(input_tokens) if isinstance(input_tokens, (int, float)) else None,
        int(output_tokens) if isinstance(output_tokens, (int, float)) else None,
    )


def _dedupe_references(raw_references: list[dict[str, Any]]) -> list[dict[str, Any]]:
    deduped: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for item in raw_references:
        key = (str(item.get("kind") or ""), str(item.get("id") or ""))
        if not key[0] or not key[1] or key in seen:
            continue
        seen.add(key)
        deduped.append(item)
        if len(deduped) >= 6:
            break
    return deduped


def _send_openai_request(payload: dict[str, Any]) -> dict[str, Any]:
    settings = get_settings()
    if not settings.openai_api_key:
        raise ChatServiceError("OPENAI_API_KEY is not configured")

    headers = {
        "Authorization": f"Bearer {settings.openai_api_key}",
        "Content-Type": "application/json",
    }
    timeout_sec = max(settings.openai_timeout_ms, 1000) / 1000

    with httpx.Client(timeout=timeout_sec) as client:
        response = client.post(OPENAI_RESPONSES_URL, headers=headers, json=payload)

    if response.status_code >= 400:
        detail = response.text
        try:
            error_payload = response.json()
            detail = str(error_payload.get("error", {}).get("message") or detail)
        except Exception:
            pass
        raise ChatServiceError(f"OpenAI request failed: {detail}")

    return response.json()


def run_chat(
    *,
    message: str,
    user_id: str,
    role: RoleType,
    previous_response_id: str | None,
    course_id: str | None,
    current_path: str | None,
    lesson_id: str | None,
    surface: str | None,
) -> tuple[dict[str, Any], str | None, list[dict[str, Any]], int, int | None, int | None]:
    started = time.perf_counter()
    if surface == "quiz_restricted":
        response = _maybe_handle_quiz_restricted(message)
        latency_ms = int((time.perf_counter() - started) * 1000)
        return response, None, [], latency_ms, None, None

    settings = get_settings()
    normalized_course_id = course_id or derive_course_id_from_path(current_path, role, user_id)
    current_course = lookup_course_context(normalized_course_id, role, user_id)
    current_lesson = lookup_lesson_context_by_id(lesson_id, role, user_id) or lookup_lesson_context(
        current_path, role, user_id
    )
    tool_context = ToolContext(user_id=user_id, role=role)
    instructions = _build_instructions(role, surface, current_course, current_lesson)
    tool_trace: list[dict[str, Any]] = []
    collected_references: list[dict[str, Any]] = []

    payload: dict[str, Any] = {
        "model": settings.openai_model,
        "instructions": instructions,
        "input": message,
        "store": True,
        "tools": list_openai_tools(),
        "reasoning": {"effort": settings.openai_reasoning_effort},
        "text": {"format": CHAT_RESPONSE_FORMAT},
    }
    if previous_response_id:
        payload["previous_response_id"] = previous_response_id

    response_payload = _send_openai_request(payload)
    final_response_id = str(response_payload.get("id") or "") or None
    prompt_tokens, completion_tokens = _extract_usage(response_payload)

    for _ in range(max(settings.ai_max_tool_calls, 0)):
        calls = _extract_tool_calls(response_payload)
        if not calls:
            break

        tool_outputs: list[dict[str, Any]] = []
        for call in calls:
            try:
                arguments = _parse_json(call["arguments"])
            except Exception:
                arguments = {}

            try:
                result = execute_tool(call["name"], arguments, tool_context)
                output_payload = result.payload
                collected_references.extend([reference.model_dump(mode="json") for reference in result.references])
            except Exception as exc:
                output_payload = {
                    "error": str(exc),
                    "ok": False,
                }

            tool_trace.append(
                {
                    "tool": call["name"],
                    "call_id": call["call_id"],
                    "arguments": arguments,
                    "output": output_payload,
                }
            )
            tool_outputs.append(
                {
                    "type": "function_call_output",
                    "call_id": call["call_id"],
                    "output": serialize_tool_payload(output_payload),
                }
            )

        response_payload = _send_openai_request(
            {
                "model": settings.openai_model,
                "instructions": instructions,
                "input": tool_outputs,
                "previous_response_id": response_payload.get("id"),
                "store": True,
                "tools": list_openai_tools(),
                "reasoning": {"effort": settings.openai_reasoning_effort},
                "text": {"format": CHAT_RESPONSE_FORMAT},
            }
        )
        final_response_id = str(response_payload.get("id") or "") or final_response_id
        prompt_tokens, completion_tokens = _extract_usage(response_payload)

    raw_output = _extract_output_text(response_payload)
    suggested_questions: list[str] = []
    answer = raw_output.strip() or "Tôi chưa thể trả lời câu hỏi này lúc này."

    try:
        parsed = _parse_json(raw_output)
        answer = str(parsed.get("answer") or answer).strip() or answer
        suggested_questions = [
            str(item).strip()
            for item in (parsed.get("suggested_questions") or [])
            if str(item).strip()
        ][:3]
    except Exception:
        suggested_questions = []

    response = ChatResponse(
        answer=answer,
        references=_dedupe_references(collected_references),
        suggested_questions=suggested_questions,
    ).model_dump(mode="json")

    latency_ms = int((time.perf_counter() - started) * 1000)
    return response, final_response_id, tool_trace, latency_ms, prompt_tokens, completion_tokens


def run_lesson_study(
    *,
    lesson_id: str,
    user_id: str,
    role: RoleType,
    current_path: str | None,
    mode: str | None,
) -> tuple[dict[str, Any], int]:
    started = time.perf_counter()
    settings = get_settings()
    normalized_mode = str(mode or "default").strip() or "default"
    tool_context = ToolContext(user_id=user_id, role=role)

    lesson_result = execute_tool(
        "get_lesson_content",
        {
            "lesson_id_or_slug": lesson_id,
            "course_id_or_slug": None,
        },
        tool_context,
    )
    lesson = lesson_result.payload.get("lesson")
    if not isinstance(lesson, dict):
        response = LessonStudyResponse(
            source_state="metadata_only",
            summary="Không tìm thấy nội dung bài học phù hợp trong hệ thống.",
            key_points=[],
            likely_misunderstandings=[],
            common_pitfalls=[],
            self_check_questions=[],
            simple_explanation="Hiện chưa có đủ dữ liệu để phân tích sâu bài học này.",
            example_explanation="",
            study_notes=[],
            follow_up_prompts=[],
        ).model_dump(mode="json")
        return response, int((time.perf_counter() - started) * 1000)

    lesson_payload = _lesson_study_cache_payload(lesson)
    content_hash = _lesson_study_content_hash(lesson_payload)
    content_text = str(lesson_payload["lesson"].get("content_text") or "").strip()
    content_word_count = int(lesson_payload["lesson"].get("content_word_count") or 0)
    normalized_lesson_id = str(lesson.get("id") or lesson_id)

    cached_response = get_cached_lesson_study(
        lesson_id=normalized_lesson_id,
        mode=normalized_mode,
        content_hash=content_hash,
        prompt_version=LESSON_STUDY_PROMPT_VERSION,
        model=settings.openai_model,
    )
    parsed_cached_response = _parse_cached_lesson_study(cached_response)
    if parsed_cached_response:
        return parsed_cached_response, int((time.perf_counter() - started) * 1000)

    if content_word_count < 40:
        response = LessonStudyResponse(
            source_state="metadata_only",
            summary="Bài học này chưa có đủ nội dung văn bản để tạo phân tích sâu.",
            key_points=[],
            likely_misunderstandings=[],
            common_pitfalls=[],
            self_check_questions=[],
            simple_explanation="Bạn vẫn có thể dùng AI Chat để hỏi theo metadata hoặc mở trực tiếp nội dung bài học.",
            example_explanation="",
            study_notes=[],
            follow_up_prompts=[
                "Tóm tắt ngắn bài học này theo metadata hiện có.",
                "Bài học này thuộc module nào?",
                "Tôi nên học tiếp phần nào sau bài này?",
            ],
        ).model_dump(mode="json")
        save_cached_lesson_study(
            lesson_id=normalized_lesson_id,
            mode=normalized_mode,
            content_hash=content_hash,
            prompt_version=LESSON_STUDY_PROMPT_VERSION,
            model=settings.openai_model,
            source_state="metadata_only",
            content_word_count=content_word_count,
            payload=response,
        )
        return response, int((time.perf_counter() - started) * 1000)

    lesson_context = lookup_lesson_context_by_id(lesson_id, role, user_id) or lookup_lesson_context(
        current_path, role, user_id
    )
    course_context = None
    if lesson_context and lesson_context.get("course_id"):
        course_context = lookup_course_context(str(lesson_context["course_id"]), role, user_id)

    instructions = (
        "You are Kognify AI Lesson Study Assistant. "
        "Analyze the provided lesson body deeply and return only valid JSON. "
        "Do not invent facts outside the provided lesson payload. "
        "Use Vietnamese by default, but mirror the user's language when clearly different. "
        f"Current course context: {_json_dump(course_context or {})}. "
        f"Current lesson context: {_json_dump(lesson_context or lesson)}. "
        "Write concise, student-friendly learning support. "
        "Summary should be 2-4 sentences. "
        "Key points should contain 3 to 5 short bullets. "
        "Likely misunderstandings should contain 2 to 3 specific mistakes or confusions. "
        "Common pitfalls should contain 2 to 3 structured entries with misunderstanding and correction. "
        "Self-check questions should contain 2 to 3 reflective questions. "
        "Simple explanation should explain the lesson for a beginner in one short paragraph. "
        "Example explanation should explain the lesson through one concrete example or analogy in one short paragraph. "
        "Study notes should contain 3 to 5 short note-like bullets that a student could copy into notes. "
        "Follow-up prompts should contain up to 3 short suggested questions."
    )

    response_payload = _send_openai_request(
        {
            "model": settings.openai_model,
            "instructions": instructions,
            "input": _json_dump(lesson_payload),
            "store": False,
            "reasoning": {"effort": settings.openai_reasoning_effort},
            "text": {"format": LESSON_STUDY_RESPONSE_FORMAT},
        }
    )

    raw_output = _extract_output_text(response_payload)
    parsed = _parse_json(raw_output)
    response = LessonStudyResponse(
        source_state="full_lesson_body",
        summary=str(parsed.get("summary") or "").strip(),
        key_points=[str(item).strip() for item in parsed.get("key_points", []) if str(item).strip()][:5],
        likely_misunderstandings=[
            str(item).strip()
            for item in parsed.get("likely_misunderstandings", [])
            if str(item).strip()
        ][:3],
        common_pitfalls=[
            LessonCommonPitfall(
                misunderstanding=str(item.get("misunderstanding") or "").strip(),
                correction=str(item.get("correction") or "").strip(),
            )
            for item in (parsed.get("common_pitfalls") or [])
            if isinstance(item, dict)
            and str(item.get("misunderstanding") or "").strip()
            and str(item.get("correction") or "").strip()
        ][:3],
        self_check_questions=[
            str(item).strip()
            for item in parsed.get("self_check_questions", [])
            if str(item).strip()
        ][:3],
        simple_explanation=str(parsed.get("simple_explanation") or "").strip(),
        example_explanation=str(parsed.get("example_explanation") or "").strip(),
        study_notes=[str(item).strip() for item in parsed.get("study_notes", []) if str(item).strip()][:5],
        follow_up_prompts=[
            str(item).strip() for item in parsed.get("follow_up_prompts", []) if str(item).strip()
        ][:3],
    ).model_dump(mode="json")

    save_cached_lesson_study(
        lesson_id=normalized_lesson_id,
        mode=normalized_mode,
        content_hash=content_hash,
        prompt_version=LESSON_STUDY_PROMPT_VERSION,
        model=settings.openai_model,
        source_state="full_lesson_body",
        content_word_count=content_word_count,
        payload=response,
    )
    return response, int((time.perf_counter() - started) * 1000)
