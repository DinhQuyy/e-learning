from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.responses import JSONResponse

from .config import get_settings
from .indexing import to_queue_job, upsert_document
from .migrate import run_migrations
from .models import (
    AssignmentRequest,
    AssistantRequest,
    AssistantSuggestionsResponse,
    ChatRequest,
    CustomQaImportRequest,
    CustomQaImportResponse,
    DailyMetricsResponse,
    DailyMetricsSummary,
    FeedbackRequest,
    FeedbackResponse,
    HelpdeskSuggestionsResponse,
    IndexingRequeueRequest,
    IndexingRequeueResponse,
    IndexingStatusResponse,
    IndexDocumentRequest,
    InstructorRiskRequest,
    InstructorRiskResponse,
    LearningEventRequest,
    MentorAnalyticsRequest,
    MentorAnalyticsResponse,
    MentorRequest,
    MentorRecommendationClickRequest,
    MentorRecommendationDismissRequest,
    MentorInterventionLogRequest,
    MentorInterventionLogResponse,
    MetricsResponse,
    ReferenceSuggestionsResponse,
    StatusResponse,
)
from .redis_client import get_redis
from .indexing import build_custom_qa_content, build_custom_qa_source_id, purge_document_set
from .services import (
    augment_mentor_output_with_context,
    build_instructor_risk_items,
    build_mentor_context,
    clear_runtime_caches,
    list_assistant_suggestions,
    list_helpdesk_suggestions,
    list_reference_suggestions,
    run_assistant,
    run_assignment,
    run_helpdesk,
    run_mentor,
    run_references,
)
from .store import (
    ensure_conversation,
    get_indexing_status,
    get_daily_metrics,
    get_mentor_analytics,
    get_metrics,
    log_mentor_intervention,
    mark_mentor_recommendation_clicked,
    mark_mentor_recommendation_dismissed,
    mark_mentor_recommendations_completed,
    list_documents_for_requeue,
    log_message,
    record_event,
    refresh_learning_progress,
    save_feedback,
    save_mentor_recommendations,
    upsert_daily_metrics,
)

app = FastAPI(title='E-Learning AI API', version='0.1.0')


def _attach_recommendation_ids(items: list[dict[str, Any]], recommendation_ids: list[str]) -> None:
    for index, recommendation_id in enumerate(recommendation_ids):
        if index >= len(items):
            break
        if recommendation_id:
            items[index]['recommendation_id'] = recommendation_id


@app.on_event('startup')
def startup_migrations() -> None:
    run_migrations()


def verify_internal_key(x_ai_internal_key: str = Header(default='')) -> None:
    settings = get_settings()
    if x_ai_internal_key != settings.ai_internal_key:
        raise HTTPException(status_code=401, detail='Invalid internal key')


def _rate_limit(user_id: str, mode: str) -> None:
    settings = get_settings()
    redis = get_redis()

    bucket = datetime.now(tz=timezone.utc).strftime('%Y%m%d%H%M')
    key = f'ai:ratelimit:{mode}:{user_id}:{bucket}'
    current = redis.incr(key)
    if current == 1:
        redis.expire(key, 120)

    if current > settings.rate_limit_per_min:
        raise HTTPException(status_code=429, detail='Too many AI requests')


def _clear_pattern_keys(redis_client: Any, pattern: str) -> int:
    deleted = 0
    cursor = 0
    while True:
        cursor, keys = redis_client.scan(cursor=cursor, match=pattern, count=200)
        if keys:
            deleted += int(redis_client.delete(*keys) or 0)
        if cursor == 0:
            break
    return deleted


@app.get('/v1/health')
def health() -> dict[str, Any]:
    return {'status': 'ok', 'service': 'ai-api'}


@app.get('/v1/helpdesk/suggestions', response_model=HelpdeskSuggestionsResponse)
def helpdesk_suggestions(
    role: Literal['admin', 'instructor', 'student'],
    course_id: str | None = None,
    q: str = "",
    limit: int = Query(default=8, ge=1, le=25),
    _auth: None = Depends(verify_internal_key),
) -> HelpdeskSuggestionsResponse:
    settings = get_settings()
    source_types = settings.strict_qa_source_types_set or ('custom_qa', 'faq')
    items = list_helpdesk_suggestions(
        role=role,
        course_id=course_id,
        source_types=source_types,
        query=q,
        limit=limit,
    )
    return HelpdeskSuggestionsResponse(query=q, items=items)


@app.get('/v1/references/suggestions', response_model=ReferenceSuggestionsResponse)
def references_suggestions(
    q: str = "",
    limit: int = Query(default=8, ge=1, le=25),
    _auth: None = Depends(verify_internal_key),
) -> ReferenceSuggestionsResponse:
    items = list_reference_suggestions(query=q, limit=limit)
    return ReferenceSuggestionsResponse(query=q, items=items)


@app.get('/v1/assistant/suggestions', response_model=AssistantSuggestionsResponse)
def assistant_suggestions(
    role: Literal['admin', 'instructor', 'student'],
    course_id: str | None = None,
    mode: Literal['auto', 'helpdesk', 'references'] = 'auto',
    q: str = "",
    limit: int = Query(default=10, ge=1, le=25),
    _auth: None = Depends(verify_internal_key),
) -> AssistantSuggestionsResponse:
    items = list_assistant_suggestions(
        role=role,
        course_id=course_id,
        query=q,
        requested_mode=mode,
        limit=limit,
    )
    return AssistantSuggestionsResponse(query=q, requested_mode=mode, items=items)


@app.post('/v1/index/document')
def index_document(payload: IndexDocumentRequest, _auth: None = Depends(verify_internal_key)) -> dict[str, Any]:
    document_id, unchanged = upsert_document(payload)

    if payload.operation == 'delete':
        return {'status': 'deleted', 'document_id': document_id}

    if unchanged:
        return {'status': 'skipped', 'reason': 'content_hash_unchanged', 'document_id': document_id}

    redis = get_redis()
    redis.rpush(get_settings().queue_index_name, to_queue_job(document_id))

    return {'status': 'queued', 'document_id': document_id}


@app.post('/v1/admin/custom-qa/import', response_model=CustomQaImportResponse)
def import_custom_qa(payload: CustomQaImportRequest, _auth: None = Depends(verify_internal_key)) -> CustomQaImportResponse:
    settings = get_settings()
    redis = get_redis()

    replaced_deleted = 0
    if payload.replace_set:
        replaced_deleted = purge_document_set(payload.source_type, payload.set_name)

    source_ids: list[str] = []
    imported = 0
    queued = 0

    for index, item in enumerate(payload.items, start=1):
        source_id = build_custom_qa_source_id(payload.set_name, item, index)
        source_ids.append(source_id)

        document_payload = IndexDocumentRequest(
            source_type=payload.source_type,
            source_id=source_id,
            title=item.question.strip(),
            content=build_custom_qa_content(item),
            visibility=payload.visibility,
            course_id=payload.course_id,
            operation='upsert',
        )

        document_id, unchanged = upsert_document(document_payload)
        imported += 1

        if not unchanged and document_id:
            redis.rpush(settings.queue_index_name, to_queue_job(document_id))
            queued += 1

    # Invalidate runtime + Redis caches so newly imported QA is used immediately.
    clear_runtime_caches()
    _clear_pattern_keys(redis, "ai:response:helpdesk:*")
    _clear_pattern_keys(redis, "ai:response:references:*")
    _clear_pattern_keys(redis, "ai:retrieval:*")

    return CustomQaImportResponse(
        status='ok',
        set_name=payload.set_name,
        source_type=payload.source_type,
        replaced_deleted=replaced_deleted,
        imported=imported,
        queued=queued,
        source_ids=source_ids,
    )


@app.post('/v1/chat')
def chat(payload: ChatRequest, _auth: None = Depends(verify_internal_key)) -> JSONResponse:
    _rate_limit(payload.user_id, payload.mode)

    conversation_id = ensure_conversation(
        conversation_id=payload.conversation_id,
        user_id=payload.user_id,
        mode=payload.mode,
        course_id=payload.course_id,
    )

    log_message(conversation_id=conversation_id, role='user', content=payload.query)

    if payload.mode == 'helpdesk':
        output, chunks, latency_ms, prompt_tokens, completion_tokens = run_helpdesk(
            payload.query, payload.role, payload.course_id
        )
    else:
        output, chunks, latency_ms, prompt_tokens, completion_tokens = run_references(
            payload.query,
            payload.role,
            payload.course_id,
            payload.context.get('level') if isinstance(payload.context, dict) else None,
        )

    chunk_ids = [str(chunk.get('id')) for chunk in chunks]
    assistant_message_id = log_message(
        conversation_id=conversation_id,
        role='assistant',
        content=json.dumps(output, ensure_ascii=False),
        retrieved_chunk_ids=chunk_ids,
        latency_ms=latency_ms,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        model=get_settings().llm_chat_model,
    )

    return JSONResponse(
        {
            'conversation_id': conversation_id,
            'assistant_message_id': assistant_message_id,
            'data': output,
        }
    )


@app.post('/v1/assistant/chat')
def assistant_chat(payload: AssistantRequest, _auth: None = Depends(verify_internal_key)) -> JSONResponse:
    _rate_limit(payload.user_id, 'assistant')

    output, resolved_mode, chunks, latency_ms, prompt_tokens, completion_tokens = run_assistant(
        payload.query,
        payload.role,
        payload.course_id,
        payload.mode,
        payload.context.get('level') if isinstance(payload.context, dict) else None,
    )

    conversation_id: str | None = None
    assistant_message_id: str | None = None

    if resolved_mode is not None:
        conversation_id = ensure_conversation(
            conversation_id=payload.conversation_id,
            user_id=payload.user_id,
            mode=resolved_mode,
            course_id=payload.course_id,
        )

        log_message(conversation_id=conversation_id, role='user', content=payload.query)

        assistant_message_id = log_message(
            conversation_id=conversation_id,
            role='assistant',
            content=json.dumps(output.get('data') or {}, ensure_ascii=False),
            retrieved_chunk_ids=[str(chunk.get('id')) for chunk in chunks],
            latency_ms=latency_ms,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            model=get_settings().llm_chat_model,
        )

    return JSONResponse(
        {
            'conversation_id': conversation_id,
            'assistant_message_id': assistant_message_id,
            'data': output,
        }
    )


@app.post('/v1/mentor/summary')
def mentor_summary(payload: MentorRequest, _auth: None = Depends(verify_internal_key)) -> JSONResponse:
    _rate_limit(payload.user_id, 'mentor')

    conversation_id = ensure_conversation(
        conversation_id=payload.conversation_id,
        user_id=payload.user_id,
        mode='mentor',
        course_id=payload.course_id,
    )

    mentor_context = build_mentor_context(payload.user_id, payload.context)
    log_message(
        conversation_id=conversation_id,
        role='user',
        content=json.dumps({'course_id': payload.course_id, 'context': mentor_context}, ensure_ascii=False),
    )
    output, latency_ms, prompt_tokens, completion_tokens = run_mentor(mentor_context)
    output = augment_mentor_output_with_context(output, mentor_context)

    today_plan = output.get('today_plan') if isinstance(output.get('today_plan'), list) else []
    overdue = output.get('overdue') if isinstance(output.get('overdue'), list) else []
    today_ids = save_mentor_recommendations(
        conversation_id=conversation_id,
        user_id=payload.user_id,
        items=today_plan,
        source_bucket='today_plan',
    )
    overdue_ids = save_mentor_recommendations(
        conversation_id=conversation_id,
        user_id=payload.user_id,
        items=overdue,
        source_bucket='overdue',
    )
    _attach_recommendation_ids(today_plan, today_ids)
    _attach_recommendation_ids(overdue, overdue_ids)

    assistant_message_id = log_message(
        conversation_id=conversation_id,
        role='assistant',
        content=json.dumps(output, ensure_ascii=False),
        retrieved_chunk_ids=[],
        latency_ms=latency_ms,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        model=get_settings().llm_chat_model,
    )

    return JSONResponse(
        {
            'conversation_id': conversation_id,
            'assistant_message_id': assistant_message_id,
            'data': output,
        }
    )


@app.post('/v1/mentor/recommendation-click', response_model=StatusResponse)
def mentor_recommendation_click(
    payload: MentorRecommendationClickRequest, _auth: None = Depends(verify_internal_key)
) -> StatusResponse:
    updated = mark_mentor_recommendation_clicked(payload.user_id, payload.recommendation_id)
    if not updated:
        raise HTTPException(status_code=404, detail='Recommendation not found')
    return StatusResponse(status='ok')


@app.post('/v1/mentor/recommendation-dismiss', response_model=StatusResponse)
def mentor_recommendation_dismiss(
    payload: MentorRecommendationDismissRequest, _auth: None = Depends(verify_internal_key)
) -> StatusResponse:
    updated = mark_mentor_recommendation_dismissed(
        payload.user_id,
        payload.recommendation_id,
        payload.reason,
    )
    if not updated:
        raise HTTPException(status_code=404, detail='Recommendation not found')
    return StatusResponse(status='ok')


@app.post('/v1/mentor/interventions/log', response_model=MentorInterventionLogResponse)
def mentor_interventions_log(
    payload: MentorInterventionLogRequest, _auth: None = Depends(verify_internal_key)
) -> MentorInterventionLogResponse:
    intervention_id = log_mentor_intervention(
        instructor_id=payload.instructor_id,
        student_id=payload.student_id,
        course_id=payload.course_id,
        lesson_id=payload.lesson_id,
        recommendation_id=payload.recommendation_id,
        action_type=payload.action_type,
        channel=payload.channel,
        status=payload.status,
        title=payload.title,
        message=payload.message,
        metadata=payload.metadata,
    )
    return MentorInterventionLogResponse(status='ok', intervention_id=intervention_id)


@app.post('/v1/mentor/analytics', response_model=MentorAnalyticsResponse)
def mentor_analytics(
    payload: MentorAnalyticsRequest, _auth: None = Depends(verify_internal_key)
) -> MentorAnalyticsResponse:
    snapshot = get_mentor_analytics(
        course_ids=payload.course_ids,
        lookback_days=payload.lookback_days,
    )
    return MentorAnalyticsResponse(**snapshot)


@app.post('/v1/instructor/risk', response_model=InstructorRiskResponse)
def instructor_risk(
    payload: InstructorRiskRequest, _auth: None = Depends(verify_internal_key)
) -> InstructorRiskResponse:
    items = build_instructor_risk_items(payload.course_ids, limit=payload.limit)
    return InstructorRiskResponse(items=items)


@app.post('/v1/assignment/hint')
def assignment_hint(payload: AssignmentRequest, _auth: None = Depends(verify_internal_key)) -> JSONResponse:
    _rate_limit(payload.user_id, 'assignment')

    conversation_id = ensure_conversation(
        conversation_id=payload.conversation_id,
        user_id=payload.user_id,
        mode='assignment',
        course_id=payload.course_id,
    )

    output, chunks, latency_ms, prompt_tokens, completion_tokens = run_assignment(
        user_id=payload.user_id,
        question=payload.question,
        student_attempt=payload.student_attempt,
        role=payload.role,
        course_id=payload.course_id,
    )
    log_message(
        conversation_id=conversation_id,
        role='user',
        content=json.dumps(
            {
                'question': payload.question,
                'student_attempt': payload.student_attempt,
                'lesson_id': payload.lesson_id,
                'quiz_id': payload.quiz_id,
            },
            ensure_ascii=False,
        ),
    )

    chunk_ids = [str(chunk.get('id')) for chunk in chunks]

    assistant_message_id = log_message(
        conversation_id=conversation_id,
        role='assistant',
        content=json.dumps(output, ensure_ascii=False),
        retrieved_chunk_ids=chunk_ids,
        latency_ms=latency_ms,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        model=get_settings().llm_chat_model,
    )

    return JSONResponse(
        {
            'conversation_id': conversation_id,
            'assistant_message_id': assistant_message_id,
            'data': output,
        }
    )


@app.post('/v1/events/learning')
def learning_event(payload: LearningEventRequest, _auth: None = Depends(verify_internal_key)) -> dict[str, Any]:
    record_event(
        user_id=payload.user_id,
        course_id=payload.course_id,
        lesson_id=payload.lesson_id,
        event_type=payload.event_type,
        duration_sec=int(payload.duration_sec or 0),
        metadata=payload.metadata,
    )

    refresh_learning_progress(user_id=payload.user_id, course_id=payload.course_id)
    if payload.event_type == 'lesson_complete' and payload.lesson_id:
        mark_mentor_recommendations_completed(
            user_id=payload.user_id,
            course_id=payload.course_id,
            lesson_id=payload.lesson_id,
        )
    return {'status': 'ok'}


@app.get('/v1/admin/indexing/status', response_model=IndexingStatusResponse)
def admin_indexing_status(_auth: None = Depends(verify_internal_key)) -> IndexingStatusResponse:
    settings = get_settings()
    redis = get_redis()
    queue_depth = int(redis.llen(settings.queue_index_name) or 0)
    snapshot = get_indexing_status(queue_depth=queue_depth)
    return IndexingStatusResponse(**snapshot)


@app.post('/v1/admin/indexing/requeue', response_model=IndexingRequeueResponse)
def admin_indexing_requeue(
    payload: IndexingRequeueRequest, _auth: None = Depends(verify_internal_key)
) -> IndexingRequeueResponse:
    settings = get_settings()
    redis = get_redis()
    document_ids = list_documents_for_requeue(
        source_type=payload.source_type,
        course_id=payload.course_id,
        pending_only=payload.pending_only,
        limit=payload.limit,
    )

    if document_ids:
        jobs = [to_queue_job(document_id) for document_id in document_ids]
        redis.rpush(settings.queue_index_name, *jobs)

    queue_depth = int(redis.llen(settings.queue_index_name) or 0)
    return IndexingRequeueResponse(
        status='ok',
        queued=len(document_ids),
        queue_depth=queue_depth,
        document_ids=document_ids,
    )


@app.get('/v1/admin/metrics', response_model=MetricsResponse)
def admin_metrics(_auth: None = Depends(verify_internal_key)) -> MetricsResponse:
    metrics = get_metrics()
    return MetricsResponse(**metrics)


def _pct_change(current: float, previous: float) -> float:
    if previous == 0:
        if current == 0:
            return 0.0
        return 100.0
    return ((current - previous) / previous) * 100.0


@app.get('/v1/admin/metrics/daily', response_model=DailyMetricsResponse)
def admin_metrics_daily(days: int = 14, _auth: None = Depends(verify_internal_key)) -> DailyMetricsResponse:
    safe_days = min(max(days, 2), 60)

    # Ensure yesterday snapshot exists even if worker has not run yet.
    yesterday = (datetime.now(tz=timezone.utc) - timedelta(days=1)).date().isoformat()
    upsert_daily_metrics(yesterday)

    rows = get_daily_metrics(safe_days)
    half = max(len(rows) // 2, 1)
    recent = rows[:half]
    previous = rows[half: half * 2]

    def _avg(items: list[dict[str, Any]], key: str) -> float:
        if not items:
            return 0.0
        return float(sum(float(item.get(key) or 0) for item in items) / len(items))

    recent_req = _avg(recent, 'total_requests')
    previous_req = _avg(previous, 'total_requests')
    recent_p95 = _avg(recent, 'p95_latency_ms')
    previous_p95 = _avg(previous, 'p95_latency_ms')
    recent_fallback = _avg(recent, 'fallback_rate')
    previous_fallback = _avg(previous, 'fallback_rate')
    recent_pos_feedback = _avg(recent, 'positive_feedback')
    previous_pos_feedback = _avg(previous, 'positive_feedback')

    summary = DailyMetricsSummary(
        window_days=half,
        req_change_pct=round(_pct_change(recent_req, previous_req), 2),
        p95_improvement_pct=round(-_pct_change(recent_p95, previous_p95), 2),
        fallback_improvement_pct=round(-_pct_change(recent_fallback, previous_fallback), 2),
        positive_feedback_change_pct=round(_pct_change(recent_pos_feedback, previous_pos_feedback), 2),
    )

    return DailyMetricsResponse(rows=rows, summary=summary)


@app.post('/v1/feedback', response_model=FeedbackResponse)
def submit_feedback(payload: FeedbackRequest, _auth: None = Depends(verify_internal_key)) -> FeedbackResponse:
    _rate_limit(payload.user_id, 'feedback')

    feedback_id = save_feedback(
        user_id=payload.user_id,
        conversation_id=payload.conversation_id,
        message_id=payload.message_id,
        mode=payload.mode,
        rating=int(payload.rating),
        comment=payload.comment,
        include_in_training=payload.include_in_training,
    )

    return FeedbackResponse(status='ok', feedback_id=feedback_id)


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={'error': exc.detail})


@app.exception_handler(Exception)
async def generic_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=500, content={'error': 'AI service internal error', 'detail': str(exc)})
