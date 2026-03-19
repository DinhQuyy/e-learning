from __future__ import annotations

import json
import time
from typing import Any

import httpx

from .config import get_settings
from .models import ChatResponse, RoleType
from .tool_registry import (
    ToolContext,
    derive_course_id_from_path,
    execute_tool,
    list_openai_tools,
    lookup_course_context,
    serialize_tool_payload,
)

OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"
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


def _build_instructions(role: RoleType, current_course: dict[str, Any] | None) -> str:
    context_note = "Current page course context: none."
    if current_course:
        context_note = (
            "Current page course context is available. "
            f"Use course id `{current_course['course_id']}` when the user says 'khoa nay', "
            f"'course nay', or refers to the current page course. "
            f"Context: {_json_dump(current_course)}"
        )

    return (
        "You are Kognify AI, a Vietnamese-first course assistant. "
        "You only answer with data obtained from the provided tools. "
        "Do not invent course facts, lesson counts, pricing, status, or instructors. "
        "If the user asks about a course and there are multiple plausible matches, ask a concise clarifying question. "
        "If no data is found, say so directly. "
        "Use Vietnamese by default, but mirror the user's language when clearly different. "
        "Never mention internal tool names. "
        f"The signed-in user role is `{role}`. "
        f"{context_note} "
        "Return only valid JSON with this shape: "
        '{"answer":"string","suggested_questions":["string"]}. '
        "Suggested questions should be short follow-ups grounded in tool results. "
        "Keep suggested_questions to at most 3 items."
    )


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
) -> tuple[dict[str, Any], str | None, list[dict[str, Any]], int, int | None, int | None]:
    started = time.perf_counter()
    settings = get_settings()
    normalized_course_id = course_id or derive_course_id_from_path(current_path, role, user_id)
    current_course = lookup_course_context(normalized_course_id, role, user_id)
    tool_context = ToolContext(user_id=user_id, role=role)
    instructions = _build_instructions(role, current_course)
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
