from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


RoleType = Literal["admin", "instructor", "student"]
MessageRole = Literal["user", "assistant", "system"]
AiSurface = Literal[
    "global_chat",
    "dashboard_coach",
    "course_advisor",
    "lesson_study",
    "quiz_restricted",
    "quiz_mistake_review",
    "instructor_review_copilot",
]
LessonReferenceIntent = Literal["foundations", "read_more", "examples", "advanced"]


class ReferenceItem(BaseModel):
    kind: Literal["course", "module", "lesson"]
    id: str
    title: str
    url: str
    subtitle: str | None = None
    description: str | None = None


class ChatResponse(BaseModel):
    answer: str
    references: list[ReferenceItem] = Field(default_factory=list)
    suggested_questions: list[str] = Field(default_factory=list)


class ChatRequest(BaseModel):
    user_id: str
    role: RoleType
    message: str = Field(min_length=1)
    conversation_id: str | None = None
    course_id: str | None = None
    current_path: str | None = None
    lesson_id: str | None = None
    surface: AiSurface | None = None


class DashboardCoachNextAction(BaseModel):
    title: str
    body: str
    cta_label: str
    cta_href: str
    course_id: str | None = None
    lesson_id: str | None = None
    progress_percent: int | None = None


class DashboardCoachReminder(BaseModel):
    type: Literal["inactive_course", "unfinished_course", "not_started_course"]
    title: str
    body: str
    cta_label: str
    cta_href: str


class DashboardCoachWeeklyProgress(BaseModel):
    studied_seconds_7d: int
    target_seconds: int
    active_days_7d: int
    status: Literal["on_track", "behind", "idle"]


class DashboardCoachResponse(BaseModel):
    next_action: DashboardCoachNextAction
    reminders: list[DashboardCoachReminder] = Field(default_factory=list)
    weekly_progress: DashboardCoachWeeklyProgress
    help_prompts: list[str] = Field(default_factory=list)


class CourseAdvisorRequest(BaseModel):
    user_id: str
    role: RoleType
    course_id: str = Field(min_length=1)
    current_path: str | None = None


class CourseAdvisorResponse(BaseModel):
    source_state: Literal["full_course_context", "metadata_only"]
    fit_summary: str
    prerequisites_summary: str
    target_audience_summary: str
    quick_syllabus: list[str] = Field(default_factory=list)
    follow_up_prompts: list[str] = Field(default_factory=list)


class LessonStudyRequest(BaseModel):
    user_id: str
    role: RoleType
    lesson_id: str = Field(min_length=1)
    current_path: str | None = None
    mode: Literal["default"] | None = "default"


class LessonCommonPitfall(BaseModel):
    misunderstanding: str
    correction: str


class LessonStudyResponse(BaseModel):
    source_state: Literal["full_lesson_body", "metadata_only"]
    summary: str
    key_points: list[str] = Field(default_factory=list)
    likely_misunderstandings: list[str] = Field(default_factory=list)
    common_pitfalls: list[LessonCommonPitfall] = Field(default_factory=list)
    self_check_questions: list[str] = Field(default_factory=list)
    simple_explanation: str
    example_explanation: str = ""
    study_notes: list[str] = Field(default_factory=list)
    follow_up_prompts: list[str] = Field(default_factory=list)


class LessonReferenceItem(BaseModel):
    kind: Literal["course", "module", "lesson", "resource"]
    source_type: Literal["internal", "external"]
    title: str
    subtitle: str | None = None
    reason: str
    cta_label: str
    cta_href: str
    source_name: str | None = None
    provenance_note: str | None = None
    reviewed_at: str | None = None
    course_id: str | None = None
    lesson_id: str | None = None
    module_id: str | None = None


class LessonReferencesResponse(BaseModel):
    source_scope: Literal["internal_only", "internal_plus_curated_external"]
    intents: list[LessonReferenceIntent] = Field(default_factory=list)
    items: list[LessonReferenceItem] = Field(default_factory=list)


class LessonReferencesRequest(BaseModel):
    user_id: str
    role: RoleType
    lesson_id: str = Field(min_length=1)
    intent: LessonReferenceIntent | None = None


class QuizMistakeReviewRequest(BaseModel):
    user_id: str
    role: RoleType
    quiz_id: str = Field(min_length=1)
    attempt_id: str = Field(min_length=1)
    lesson_id: str | None = None
    current_path: str | None = None


class QuizMistakeCluster(BaseModel):
    title: str
    description: str
    question_ids: list[str] = Field(default_factory=list)


class QuizConceptToReview(BaseModel):
    title: str
    reason: str


class QuizLessonRevisitItem(BaseModel):
    title: str
    reason: str
    cta_href: str
    lesson_id: str | None = None
    module_id: str | None = None


class QuizMistakeReviewResponse(BaseModel):
    review_state: Literal["has_mistakes", "perfect_attempt"]
    summary: str
    mistake_clusters: list[QuizMistakeCluster] = Field(default_factory=list)
    concepts_to_review: list[QuizConceptToReview] = Field(default_factory=list)
    lessons_to_revisit: list[QuizLessonRevisitItem] = Field(default_factory=list)
    recovery_plan: list[str] = Field(default_factory=list)
    follow_up_prompts: list[str] = Field(default_factory=list)


class InstructorReviewCriterionInput(BaseModel):
    criterion_id: str
    title: str
    description: str | None = None
    max_points: float
    scoring_guidance: str | None = None


class InstructorReviewCopilotRequest(BaseModel):
    user_id: str
    role: RoleType
    course_title: str
    lesson_title: str
    assignment_title: str
    assignment_instructions: str
    lesson_content_summary: str | None = None
    submission_body: str
    submission_reference_url: str | None = None
    rubric_criteria: list[InstructorReviewCriterionInput] = Field(default_factory=list)


class InstructorReviewSuggestionCriterion(BaseModel):
    criterion_id: str
    title: str
    max_points: float
    suggested_score: float
    rationale: str
    evidence_snippets: list[str] = Field(default_factory=list)
    caution_flag: str | None = None


class InstructorReviewCopilotResponse(BaseModel):
    overall_summary: str
    proposed_final_feedback: str
    criteria: list[InstructorReviewSuggestionCriterion] = Field(default_factory=list)
    confidence: Literal["low", "medium", "high"]
    caution_flags: list[str] = Field(default_factory=list)


class FeedbackRequest(BaseModel):
    user_id: str
    conversation_id: str
    message_id: str
    mode: Literal["chat"] = "chat"
    rating: Literal[-1, 1]
    comment: str | None = None
    include_in_training: bool = False


class FeedbackResponse(BaseModel):
    status: Literal["ok"]
    feedback_id: str
