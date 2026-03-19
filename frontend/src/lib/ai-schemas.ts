import { z } from "zod";

export const aiSurfaceSchema = z.enum([
  "global_chat",
  "dashboard_coach",
  "course_advisor",
  "lesson_study",
  "quiz_restricted",
  "quiz_mistake_review",
  "instructor_review_copilot",
]);

export const lessonReferenceIntentSchema = z.enum([
  "foundations",
  "read_more",
  "examples",
  "advanced",
]);

export const aiFeedbackRequestSchema = z.object({
  conversation_id: z.string().uuid(),
  assistant_message_id: z.string().uuid(),
  mode: z.literal("chat"),
  rating: z.union([z.literal(1), z.literal(-1)]),
  comment: z.string().trim().max(1000).optional(),
  include_in_training: z.boolean().optional(),
});

export const aiFeedbackResponseSchema = z.object({
  status: z.literal("ok"),
  feedback_id: z.string().uuid(),
});

export const chatReferenceSchema = z.object({
  kind: z.enum(["course", "module", "lesson"]),
  id: z.string(),
  title: z.string(),
  url: z.string(),
  subtitle: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

export const chatResponseSchema = z.object({
  answer: z.string(),
  references: z.array(chatReferenceSchema),
  suggested_questions: z.array(z.string()),
});

export const dashboardCoachNextActionSchema = z.object({
  title: z.string(),
  body: z.string(),
  cta_label: z.string(),
  cta_href: z.string(),
  course_id: z.string().nullable().optional(),
  lesson_id: z.string().nullable().optional(),
  progress_percent: z.number().int().nullable().optional(),
});

export const dashboardCoachReminderSchema = z.object({
  type: z.enum(["inactive_course", "unfinished_course", "not_started_course"]),
  title: z.string(),
  body: z.string(),
  cta_label: z.string(),
  cta_href: z.string(),
});

export const dashboardCoachWeeklyProgressSchema = z.object({
  studied_seconds_7d: z.number().int(),
  target_seconds: z.number().int(),
  active_days_7d: z.number().int(),
  status: z.enum(["on_track", "behind", "idle"]),
});

export const dashboardCoachResponseSchema = z.object({
  next_action: dashboardCoachNextActionSchema,
  reminders: z.array(dashboardCoachReminderSchema),
  weekly_progress: dashboardCoachWeeklyProgressSchema,
  help_prompts: z.array(z.string()),
});

export const courseAdvisorResponseSchema = z.object({
  source_state: z.enum(["full_course_context", "metadata_only"]),
  fit_summary: z.string(),
  prerequisites_summary: z.string(),
  target_audience_summary: z.string(),
  quick_syllabus: z.array(z.string()),
  follow_up_prompts: z.array(z.string()),
});

export const lessonStudyResponseSchema = z.object({
  source_state: z.enum(["full_lesson_body", "metadata_only"]),
  summary: z.string(),
  key_points: z.array(z.string()).default([]),
  likely_misunderstandings: z.array(z.string()).default([]),
  common_pitfalls: z.array(
    z.object({
      misunderstanding: z.string(),
      correction: z.string(),
    })
  ).default([]),
  self_check_questions: z.array(z.string()).default([]),
  simple_explanation: z.string(),
  example_explanation: z.string().default(""),
  study_notes: z.array(z.string()).default([]),
  follow_up_prompts: z.array(z.string()).default([]),
});

export const lessonReferenceItemSchema = z.object({
  kind: z.enum(["course", "module", "lesson", "resource"]),
  source_type: z.enum(["internal", "external"]),
  title: z.string(),
  subtitle: z.string().nullable().optional(),
  reason: z.string(),
  cta_label: z.string(),
  cta_href: z.string(),
  source_name: z.string().nullable().optional(),
  provenance_note: z.string().nullable().optional(),
  reviewed_at: z.string().nullable().optional(),
  course_id: z.string().nullable().optional(),
  lesson_id: z.string().nullable().optional(),
  module_id: z.string().nullable().optional(),
});

export const lessonReferencesResponseSchema = z.object({
  source_scope: z.enum(["internal_only", "internal_plus_curated_external"]),
  intents: z.array(lessonReferenceIntentSchema),
  items: z.array(lessonReferenceItemSchema),
});

export const quizMistakeClusterSchema = z.object({
  title: z.string(),
  description: z.string(),
  question_ids: z.array(z.string()),
});

export const quizConceptToReviewSchema = z.object({
  title: z.string(),
  reason: z.string(),
});

export const quizLessonRevisitItemSchema = z.object({
  title: z.string(),
  reason: z.string(),
  cta_href: z.string(),
  lesson_id: z.string().nullable().optional(),
  module_id: z.string().nullable().optional(),
});

export const quizMistakeReviewResponseSchema = z.object({
  review_state: z.enum(["has_mistakes", "perfect_attempt"]),
  summary: z.string(),
  mistake_clusters: z.array(quizMistakeClusterSchema),
  concepts_to_review: z.array(quizConceptToReviewSchema),
  lessons_to_revisit: z.array(quizLessonRevisitItemSchema),
  recovery_plan: z.array(z.string()),
  follow_up_prompts: z.array(z.string()),
});

export const instructorReviewSuggestionCriterionSchema = z.object({
  criterion_id: z.string(),
  title: z.string(),
  max_points: z.number(),
  suggested_score: z.number(),
  rationale: z.string(),
  evidence_snippets: z.array(z.string()),
  caution_flag: z.string().nullable().optional(),
});

export const instructorReviewCopilotResponseSchema = z.object({
  overall_summary: z.string(),
  proposed_final_feedback: z.string(),
  criteria: z.array(instructorReviewSuggestionCriterionSchema),
  confidence: z.enum(["low", "medium", "high"]),
  caution_flags: z.array(z.string()),
});

export type AiFeedbackRequest = z.infer<typeof aiFeedbackRequestSchema>;
export type AiFeedbackResponse = z.infer<typeof aiFeedbackResponseSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;
export type ChatReference = z.infer<typeof chatReferenceSchema>;
export type AiSurface = z.infer<typeof aiSurfaceSchema>;
export type DashboardCoachResponse = z.infer<typeof dashboardCoachResponseSchema>;
export type DashboardCoachReminder = z.infer<typeof dashboardCoachReminderSchema>;
export type CourseAdvisorResponse = z.infer<typeof courseAdvisorResponseSchema>;
export type LessonStudyResponse = z.infer<typeof lessonStudyResponseSchema>;
export type LessonReferenceIntent = z.infer<typeof lessonReferenceIntentSchema>;
export type LessonReferenceItem = z.infer<typeof lessonReferenceItemSchema>;
export type LessonReferencesResponse = z.infer<typeof lessonReferencesResponseSchema>;
export type QuizMistakeReviewResponse = z.infer<typeof quizMistakeReviewResponseSchema>;
export type InstructorReviewCopilotResponse = z.infer<typeof instructorReviewCopilotResponseSchema>;
