import { z } from "zod";

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

export type AiFeedbackRequest = z.infer<typeof aiFeedbackRequestSchema>;
export type AiFeedbackResponse = z.infer<typeof aiFeedbackResponseSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;
export type ChatReference = z.infer<typeof chatReferenceSchema>;
