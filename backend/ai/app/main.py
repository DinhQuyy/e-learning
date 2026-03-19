from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse

from .chat_service import ChatServiceError, run_chat, run_lesson_study
from .config import get_settings
from .course_advisor_service import build_course_advisor
from .dashboard_coach_service import build_dashboard_coach
from .migrate import run_migrations
from .models import (
    ChatRequest,
    CourseAdvisorRequest,
    FeedbackRequest,
    FeedbackResponse,
    InstructorReviewCopilotRequest,
    LessonReferenceIntent,
    LessonReferencesRequest,
    LessonStudyRequest,
    QuizMistakeReviewRequest,
    RoleType,
)
from .p2_service import build_lesson_references, build_quiz_mistake_review
from .p3b_service import build_instructor_review_copilot
from .redis_client import get_redis
from .store import ensure_conversation, get_latest_assistant_response_id, log_message, save_feedback

app = FastAPI(title="Kognify AI API", version="1.0.0")


@app.on_event("startup")
def startup_migrations() -> None:
    run_migrations()


def verify_internal_key(x_ai_internal_key: str = Header(default="")) -> None:
    settings = get_settings()
    if x_ai_internal_key != settings.ai_internal_key:
        raise HTTPException(status_code=401, detail="Invalid internal key")


def _rate_limit(user_id: str, mode: str) -> None:
    settings = get_settings()
    redis = get_redis()
    bucket = datetime.now(tz=timezone.utc).strftime("%Y%m%d%H%M")
    key = f"ai:ratelimit:{mode}:{user_id}:{bucket}"
    current = redis.incr(key)
    if current == 1:
        redis.expire(key, 120)
    if current > settings.rate_limit_per_min:
        raise HTTPException(status_code=429, detail="Too many AI requests")


@app.get("/v1/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "service": "ai-api"}


@app.get("/v1/dashboard-coach")
def dashboard_coach(
    user_id: str,
    role: RoleType,
    _auth: None = Depends(verify_internal_key),
) -> JSONResponse:
    _rate_limit(user_id, "dashboard_coach")
    data = build_dashboard_coach(user_id=user_id)
    return JSONResponse({"data": data})


@app.post("/v1/course-advisor")
def course_advisor(payload: CourseAdvisorRequest, _auth: None = Depends(verify_internal_key)) -> JSONResponse:
    _rate_limit(payload.user_id, "course_advisor")
    data, latency_ms = build_course_advisor(
        course_id=payload.course_id,
        user_id=payload.user_id,
        role=payload.role,
        current_path=payload.current_path,
    )
    return JSONResponse({"data": data, "meta": {"latency_ms": latency_ms}})


@app.post("/v1/chat")
def chat(payload: ChatRequest, _auth: None = Depends(verify_internal_key)) -> JSONResponse:
    _rate_limit(payload.user_id, "chat")

    conversation_id = ensure_conversation(
        conversation_id=payload.conversation_id,
        user_id=payload.user_id,
        course_id=payload.course_id,
    )
    previous_response_id = get_latest_assistant_response_id(conversation_id)

    log_message(conversation_id=conversation_id, role="user", content=payload.message)

    response_data, openai_response_id, tool_trace, latency_ms, prompt_tokens, completion_tokens = run_chat(
        message=payload.message,
        user_id=payload.user_id,
        role=payload.role,
        previous_response_id=previous_response_id,
        course_id=payload.course_id,
        current_path=payload.current_path,
        lesson_id=payload.lesson_id,
        surface=payload.surface,
    )

    assistant_message_id = log_message(
        conversation_id=conversation_id,
        role="assistant",
        content=json.dumps(response_data, ensure_ascii=False),
        latency_ms=latency_ms,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        model=get_settings().openai_model,
        provider="openai",
        openai_response_id=openai_response_id,
        tool_trace=tool_trace,
        tool_calls_count=len(tool_trace),
    )

    return JSONResponse(
        {
            "conversation_id": conversation_id,
            "assistant_message_id": assistant_message_id,
            "data": response_data,
        }
    )


@app.post("/v1/lesson-study")
def lesson_study(payload: LessonStudyRequest, _auth: None = Depends(verify_internal_key)) -> JSONResponse:
    _rate_limit(payload.user_id, "lesson_study")
    data, latency_ms = run_lesson_study(
        lesson_id=payload.lesson_id,
        user_id=payload.user_id,
        role=payload.role,
        current_path=payload.current_path,
        mode=payload.mode,
    )
    return JSONResponse({"data": data, "meta": {"latency_ms": latency_ms}})


@app.get("/v1/lesson-references")
def lesson_references(
    user_id: str,
    role: RoleType,
    lesson_id: str,
    intent: LessonReferenceIntent | None = None,
    _auth: None = Depends(verify_internal_key),
) -> JSONResponse:
    _rate_limit(user_id, "lesson_references")
    payload = LessonReferencesRequest(user_id=user_id, role=role, lesson_id=lesson_id, intent=intent)
    data = build_lesson_references(
        lesson_id=payload.lesson_id,
        user_id=payload.user_id,
        role=payload.role,
        intent=payload.intent,
    )
    return JSONResponse({"data": data})


@app.post("/v1/quiz-mistake-review")
def quiz_mistake_review(
    payload: QuizMistakeReviewRequest,
    _auth: None = Depends(verify_internal_key),
) -> JSONResponse:
    _rate_limit(payload.user_id, "quiz_mistake_review")
    try:
        data, latency_ms = build_quiz_mistake_review(
            quiz_id=payload.quiz_id,
            attempt_id=payload.attempt_id,
            lesson_id=payload.lesson_id,
            current_path=payload.current_path,
            user_id=payload.user_id,
            role=payload.role,
        )
    except RuntimeError as exc:
        return JSONResponse(status_code=404, content={"error": str(exc)})
    return JSONResponse({"data": data, "meta": {"latency_ms": latency_ms}})


@app.post("/v1/instructor-review-copilot")
def instructor_review_copilot(
    payload: InstructorReviewCopilotRequest,
    _auth: None = Depends(verify_internal_key),
) -> JSONResponse:
    _rate_limit(payload.user_id, "instructor_review_copilot")
    data, latency_ms = build_instructor_review_copilot(payload)
    return JSONResponse({"data": data, "meta": {"latency_ms": latency_ms}})


@app.post("/v1/feedback", response_model=FeedbackResponse)
def submit_feedback(payload: FeedbackRequest, _auth: None = Depends(verify_internal_key)) -> FeedbackResponse:
    _rate_limit(payload.user_id, "feedback")
    feedback_id = save_feedback(
        user_id=payload.user_id,
        conversation_id=payload.conversation_id,
        message_id=payload.message_id,
        rating=int(payload.rating),
        comment=payload.comment,
        include_in_training=payload.include_in_training,
    )
    return FeedbackResponse(status="ok", feedback_id=feedback_id)


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})


@app.exception_handler(ChatServiceError)
async def chat_service_exception_handler(_request: Request, exc: ChatServiceError) -> JSONResponse:
    return JSONResponse(status_code=502, content={"error": str(exc)})


@app.exception_handler(Exception)
async def generic_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=500, content={"error": "AI service internal error", "detail": str(exc)})
