from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


ModeType = Literal['helpdesk', 'mentor', 'references', 'assignment']
ReferenceSourceType = Literal['references', 'course_module', 'course_lesson', 'quiz']
AssistantRequestedMode = Literal['auto', 'helpdesk', 'references']
AssistantResolvedMode = Literal['helpdesk', 'references']


class CtaModel(BaseModel):
    label: str
    href: str


class HelpdeskStepModel(BaseModel):
    title: str
    detail: str
    deep_link: str


class HelpdeskIssueModel(BaseModel):
    symptom: str
    cause: str
    fix: str


class HelpdeskSuggestionModel(BaseModel):
    question: str
    deep_link: str


class HelpdeskOutput(BaseModel):
    mode: Literal['helpdesk']
    answer_title: str
    steps: list[HelpdeskStepModel] = Field(default_factory=list)
    common_issues: list[HelpdeskIssueModel] = Field(default_factory=list)
    suggested_questions: list[HelpdeskSuggestionModel] = Field(default_factory=list)


class ReferenceRecModel(BaseModel):
    title: str
    type: Literal['course', 'book', 'article', 'video']
    level: Literal['basic', 'intermediate', 'advanced']
    reason: str
    url: str
    source_type: ReferenceSourceType | None = None
    source_ids: list[str] = Field(default_factory=list)


class ReferencesOutput(BaseModel):
    mode: Literal['references']
    topic: str
    recommendations: list[ReferenceRecModel] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)


class ReferenceSuggestionModel(BaseModel):
    title: str
    source_type: ReferenceSourceType
    url: str = ''
    search_query: str = ''
    course_title: str = ''
    course_url: str = ''
    category: str = ''
    level: str = ''


class ReferenceSuggestionsResponse(BaseModel):
    query: str
    items: list[ReferenceSuggestionModel] = Field(default_factory=list)


class AssistantSuggestionModel(BaseModel):
    kind: AssistantResolvedMode
    title: str
    description: str = ''
    url: str = ''
    search_query: str = ''
    source_type: ReferenceSourceType | None = None
    course_title: str = ''
    course_url: str = ''
    category: str = ''
    level: str = ''


class AssistantSuggestionsResponse(BaseModel):
    query: str
    requested_mode: AssistantRequestedMode = 'auto'
    items: list[AssistantSuggestionModel] = Field(default_factory=list)


class AssistantClarifyOption(BaseModel):
    label: str
    value: AssistantResolvedMode


class AssistantClarifyPayload(BaseModel):
    question: str
    options: list[AssistantClarifyOption] = Field(default_factory=list)


class AssistantResponse(BaseModel):
    kind: Literal['helpdesk', 'references', 'clarify']
    requested_mode: AssistantRequestedMode = 'auto'
    resolved_mode: AssistantResolvedMode | None = None
    route_reason: str
    data: HelpdeskOutput | ReferencesOutput | AssistantClarifyPayload


class MentorTaskModel(BaseModel):
    task: str
    eta_min: int
    why: str
    cta: CtaModel
    recommendation_id: str | None = None
    course_id: str | None = None
    course_title: str | None = None
    lesson_id: str | None = None
    priority: int | None = None
    risk_score: float | None = None
    risk_band: Literal['low', 'medium', 'high'] | None = None


class MentorOverdueModel(BaseModel):
    lesson_id: str
    title: str
    reason: str
    cta: CtaModel
    recommendation_id: str | None = None
    course_id: str | None = None
    course_title: str | None = None
    priority: int | None = None
    risk_score: float | None = None
    risk_band: Literal['low', 'medium', 'high'] | None = None


class MentorMetricsModel(BaseModel):
    progress_pct: float
    streak_days: int
    last_activity: date | None
    active_courses: int = 0
    at_risk_courses: int = 0
    weekly_minutes: int = 0


class MentorOutput(BaseModel):
    mode: Literal['mentor']
    summary: str
    today_plan: list[MentorTaskModel] = Field(default_factory=list)
    overdue: list[MentorOverdueModel] = Field(default_factory=list)
    metrics: MentorMetricsModel


class AssignmentHintModel(BaseModel):
    hint: str
    why: str


class AssignmentOutput(BaseModel):
    mode: Literal['assignment']
    restate: str
    blocked: bool
    block_reason: str
    allowed_help: list[str] = Field(default_factory=list)
    hints: list[AssignmentHintModel] = Field(default_factory=list)
    self_check: list[str] = Field(default_factory=list)


class IndexDocumentRequest(BaseModel):
    source_type: Literal[
        'course_lesson',
        'course_module',
        'system_docs',
        'faq',
        'custom_qa',
        'policy',
        'references',
        'quiz',
    ]
    source_id: str
    title: str
    content: str
    visibility: Literal['public', 'enrolled_only', 'instructor_only', 'admin_only'] = 'public'
    course_id: str | None = None
    updated_at: datetime | None = None
    operation: Literal['upsert', 'delete'] = 'upsert'


class ChatRequest(BaseModel):
    mode: Literal['helpdesk', 'references']
    user_id: str
    role: Literal['admin', 'instructor', 'student']
    query: str
    conversation_id: str | None = None
    course_id: str | None = None
    context: dict[str, Any] = Field(default_factory=dict)


class AssistantRequest(BaseModel):
    mode: AssistantRequestedMode = 'auto'
    user_id: str
    role: Literal['admin', 'instructor', 'student']
    query: str
    conversation_id: str | None = None
    course_id: str | None = None
    context: dict[str, Any] = Field(default_factory=dict)


class MentorRequest(BaseModel):
    user_id: str
    role: Literal['admin', 'instructor', 'student']
    course_id: str
    conversation_id: str | None = None
    context: dict[str, Any] = Field(default_factory=dict)


class MentorRecommendationClickRequest(BaseModel):
    user_id: str
    recommendation_id: str


class MentorRecommendationDismissRequest(BaseModel):
    user_id: str
    recommendation_id: str
    reason: str | None = None


class StatusResponse(BaseModel):
    status: Literal['ok']


class MentorInterventionLogRequest(BaseModel):
    instructor_id: str
    student_id: str
    course_id: str
    lesson_id: str | None = None
    recommendation_id: str | None = None
    action_type: Literal['nudge', 'micro_plan', 'recovery_plan']
    channel: Literal['in_app', 'email', 'multi']
    status: Literal['sent', 'failed'] = 'sent'
    title: str
    message: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class MentorInterventionLogResponse(BaseModel):
    status: Literal['ok']
    intervention_id: str


class InstructorRiskRequest(BaseModel):
    course_ids: list[str] = Field(default_factory=list)
    limit: int = Field(default=12, ge=1, le=100)


class InstructorRiskItem(BaseModel):
    user_id: str
    course_id: str
    risk_score: float
    risk_band: Literal['low', 'medium', 'high']
    inactive_days: int
    failed_quiz_attempts_7d: int
    streak_days: int
    time_spent_week_sec: int
    progress_pct: float
    last_activity_at: datetime | None = None
    recommended_action: str


class InstructorRiskResponse(BaseModel):
    items: list[InstructorRiskItem] = Field(default_factory=list)


class MentorAnalyticsRequest(BaseModel):
    course_ids: list[str] = Field(default_factory=list)
    lookback_days: int = Field(default=30, ge=1, le=180)


class MentorAnalyticsResponse(BaseModel):
    lookback_days: int
    shown: int
    clicked: int
    dismissed: int
    completed: int
    ctr: float
    completion_rate: float
    clicked_completion_rate: float
    non_clicked_completion_rate: float
    completion_lift_pp: float
    completion_lift_ratio: float
    interventions_sent: int
    notification_interventions: int
    email_interventions: int


class AssignmentRequest(BaseModel):
    user_id: str
    role: Literal['admin', 'instructor', 'student']
    course_id: str
    lesson_id: str | None = None
    quiz_id: str | None = None
    question: str
    student_attempt: str | None = None
    conversation_id: str | None = None


class LearningEventRequest(BaseModel):
    user_id: str
    course_id: str
    lesson_id: str | None = None
    event_type: Literal['lesson_start', 'lesson_complete', 'quiz_attempt', 'video_watch']
    duration_sec: int | None = 0
    metadata: dict[str, Any] = Field(default_factory=dict)


class DocumentQueueJob(BaseModel):
    document_id: str


class MetricsResponse(BaseModel):
    total_requests_24h: int
    p95_latency_ms: int
    blocked_requests_24h: int
    cache_hit_ratio: float
    fallback_rate_24h: float
    positive_feedback_24h: int
    negative_feedback_24h: int


class FeedbackRequest(BaseModel):
    user_id: str
    conversation_id: str
    message_id: str
    mode: ModeType
    rating: Literal[-1, 1]
    comment: str | None = None
    include_in_training: bool = True


class FeedbackResponse(BaseModel):
    status: Literal['ok']
    feedback_id: str


class DailyMetricRow(BaseModel):
    metric_date: date
    total_requests: int
    p95_latency_ms: int
    blocked_requests: int
    cache_hit_ratio: float
    fallback_rate: float
    positive_feedback: int
    negative_feedback: int


class DailyMetricsSummary(BaseModel):
    window_days: int
    req_change_pct: float
    p95_improvement_pct: float
    fallback_improvement_pct: float
    positive_feedback_change_pct: float


class DailyMetricsResponse(BaseModel):
    rows: list[DailyMetricRow] = Field(default_factory=list)
    summary: DailyMetricsSummary


class IndexingStatusResponse(BaseModel):
    queue_depth: int
    total_documents: int
    indexed_documents: int
    pending_documents: int
    total_chunks: int
    oldest_pending_updated_at: datetime | None = None


class IndexingRequeueRequest(BaseModel):
    source_type: str | None = None
    course_id: str | None = None
    pending_only: bool = True
    limit: int = Field(default=100, ge=1, le=500)


class IndexingRequeueResponse(BaseModel):
    status: Literal['ok']
    queued: int
    queue_depth: int
    document_ids: list[str] = Field(default_factory=list)


class CustomQaItem(BaseModel):
    id: str | None = None
    question: str = Field(min_length=1)
    answer: str = Field(min_length=1)
    deep_link: str | None = None
    aliases: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    notes: str | list[str] | None = None


class CustomQaImportRequest(BaseModel):
    set_name: str = Field(min_length=1, max_length=120)
    source_type: Literal['custom_qa', 'faq'] = 'custom_qa'
    visibility: Literal['public', 'enrolled_only', 'instructor_only', 'admin_only'] = 'public'
    course_id: str | None = None
    replace_set: bool = False
    items: list[CustomQaItem] = Field(min_length=1)


class CustomQaImportResponse(BaseModel):
    status: Literal['ok']
    set_name: str
    source_type: str
    replaced_deleted: int
    imported: int
    queued: int
    source_ids: list[str] = Field(default_factory=list)


class HelpdeskSuggestionsResponse(BaseModel):
    query: str
    items: list[HelpdeskSuggestionModel] = Field(default_factory=list)
