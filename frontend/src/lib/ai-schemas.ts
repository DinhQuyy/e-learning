import { z } from 'zod';

const referenceSourceTypeSchema = z.enum(["references", "course_module", "course_lesson", "quiz"]);
const assistantRequestedModeSchema = z.enum(["auto", "helpdesk", "references"]);

const ctaSchema = z.object({
  label: z.string(),
  href: z.string(),
});

export const helpdeskResponseSchema = z.object({
  mode: z.literal('helpdesk'),
  answer_title: z.string(),
  steps: z.array(
    z.object({
      title: z.string(),
      detail: z.string(),
      deep_link: z.string(),
    })
  ),
  common_issues: z.array(
    z.object({
      symptom: z.string(),
      cause: z.string(),
      fix: z.string(),
    })
  ),
  suggested_questions: z
    .array(
      z.object({
        question: z.string(),
        deep_link: z.string(),
      })
    )
    .optional(),
  fallback_used: z.boolean().optional(),
  retrieved_count: z.number().optional(),
  cache_hit: z.boolean().optional(),
  strict_relevance_score: z.number().optional(),
});

export const referencesResponseSchema = z.object({
  mode: z.literal('references'),
  topic: z.string(),
  recommendations: z.array(
    z.object({
      title: z.string(),
      type: z.enum(['course', 'book', 'article', 'video']),
      level: z.enum(['basic', 'intermediate', 'advanced']),
      reason: z.string(),
      url: z.string(),
      source_type: referenceSourceTypeSchema.nullable().optional(),
      source_ids: z.array(z.string()),
    })
  ),
  notes: z.array(z.string()),
  fallback_used: z.boolean().optional(),
  retrieved_count: z.number().optional(),
  cache_hit: z.boolean().optional(),
  strict_relevance_score: z.number().optional(),
});

export const mentorResponseSchema = z.object({
  mode: z.literal('mentor'),
  summary: z.string(),
  today_plan: z.array(
    z.object({
      task: z.string(),
      eta_min: z.number(),
      why: z.string(),
      cta: ctaSchema,
    })
  ),
  overdue: z.array(
    z.object({
      lesson_id: z.string(),
      title: z.string(),
      reason: z.string(),
      cta: ctaSchema,
    })
  ),
  metrics: z.object({
    progress_pct: z.number(),
    streak_days: z.number(),
    last_activity: z.string().nullable().optional(),
  }),
  fallback_used: z.boolean().optional(),
  cache_hit: z.boolean().optional(),
});

export const assignmentResponseSchema = z.object({
  mode: z.literal('assignment'),
  restate: z.string(),
  blocked: z.boolean(),
  block_reason: z.string(),
  allowed_help: z.array(z.string()),
  hints: z.array(
    z.object({
      hint: z.string(),
      why: z.string(),
    })
  ),
  self_check: z.array(z.string()),
  fallback_used: z.boolean().optional(),
  retrieved_count: z.number().optional(),
  cache_hit: z.boolean().optional(),
});

export const aiFeedbackRequestSchema = z.object({
  conversation_id: z.string().uuid(),
  assistant_message_id: z.string().uuid(),
  mode: z.enum(["helpdesk", "mentor", "references", "assignment"]),
  rating: z.union([z.literal(1), z.literal(-1)]),
  comment: z.string().trim().max(1000).optional(),
  include_in_training: z.boolean().optional(),
});

export const aiFeedbackResponseSchema = z.object({
  status: z.literal("ok"),
  feedback_id: z.string().uuid(),
});

export const helpdeskSuggestionsResponseSchema = z.object({
  query: z.string(),
  items: z.array(
    z.object({
      question: z.string(),
      deep_link: z.string(),
    })
  ),
});

export const referencesSuggestionsResponseSchema = z.object({
  query: z.string(),
  items: z.array(
    z.object({
      title: z.string(),
      source_type: referenceSourceTypeSchema,
      url: z.string(),
      search_query: z.string(),
      course_title: z.string(),
      course_url: z.string(),
      category: z.string(),
      level: z.string(),
    })
  ),
});

export const assistantSuggestionsResponseSchema = z.object({
  query: z.string(),
  requested_mode: assistantRequestedModeSchema,
  items: z.array(
    z.object({
      kind: z.enum(["helpdesk", "references"]),
      title: z.string(),
      description: z.string(),
      url: z.string(),
      search_query: z.string(),
      source_type: referenceSourceTypeSchema.nullable().optional(),
      course_title: z.string(),
      course_url: z.string(),
      category: z.string(),
      level: z.string(),
    })
  ),
});

const assistantBaseSchema = z.object({
  requested_mode: assistantRequestedModeSchema,
  resolved_mode: z.enum(["helpdesk", "references"]).nullable(),
  route_reason: z.string(),
});

export const assistantResponseSchema = z.discriminatedUnion("kind", [
  assistantBaseSchema.extend({
    kind: z.literal("helpdesk"),
    data: helpdeskResponseSchema,
  }),
  assistantBaseSchema.extend({
    kind: z.literal("references"),
    data: referencesResponseSchema,
  }),
  assistantBaseSchema.extend({
    kind: z.literal("clarify"),
    data: z.object({
      question: z.string(),
      options: z.array(
        z.object({
          label: z.string(),
          value: z.enum(["helpdesk", "references"]),
        })
      ),
    }),
  }),
]);

export type HelpdeskResponse = z.infer<typeof helpdeskResponseSchema>;
export type ReferencesResponse = z.infer<typeof referencesResponseSchema>;
export type MentorResponse = z.infer<typeof mentorResponseSchema>;
export type AssignmentResponse = z.infer<typeof assignmentResponseSchema>;
export type AiFeedbackRequest = z.infer<typeof aiFeedbackRequestSchema>;
export type AiFeedbackResponse = z.infer<typeof aiFeedbackResponseSchema>;
export type HelpdeskSuggestionsResponse = z.infer<typeof helpdeskSuggestionsResponseSchema>;
export type ReferencesSuggestionsResponse = z.infer<typeof referencesSuggestionsResponseSchema>;
export type AssistantSuggestionsResponse = z.infer<typeof assistantSuggestionsResponseSchema>;
export type AssistantResponse = z.infer<typeof assistantResponseSchema>;
