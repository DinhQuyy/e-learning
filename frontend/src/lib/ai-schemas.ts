import { z } from 'zod';

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

export type HelpdeskResponse = z.infer<typeof helpdeskResponseSchema>;
export type ReferencesResponse = z.infer<typeof referencesResponseSchema>;
export type MentorResponse = z.infer<typeof mentorResponseSchema>;
export type AssignmentResponse = z.infer<typeof assignmentResponseSchema>;
export type AiFeedbackRequest = z.infer<typeof aiFeedbackRequestSchema>;
export type AiFeedbackResponse = z.infer<typeof aiFeedbackResponseSchema>;
export type HelpdeskSuggestionsResponse = z.infer<typeof helpdeskSuggestionsResponseSchema>;
