import { z } from 'zod';

const aiApiUrl = process.env.AI_API_URL || 'http://localhost:8090';
const aiInternalKey = process.env.AI_INTERNAL_KEY || '';

type AiEnvelope<T> = {
  data: T;
  conversationId: string | null;
  assistantMessageId: string | null;
};

export async function callAiApiWithMeta<T>(
  path: string,
  body: unknown,
  schema: z.ZodSchema<T>
): Promise<AiEnvelope<T>> {
  const res = await fetch(`${aiApiUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-AI-Internal-Key': aiInternalKey,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || 'AI service request failed');
  }

  const payload = await res.json();
  const parsed = schema.safeParse(payload?.data);
  if (!parsed.success) {
    throw new Error('AI response schema validation failed');
  }

  return {
    data: parsed.data,
    conversationId:
      typeof payload?.conversation_id === 'string' ? payload.conversation_id : null,
    assistantMessageId:
      typeof payload?.assistant_message_id === 'string'
        ? payload.assistant_message_id
        : null,
  };
}

export async function callAiApi<T>(
  path: string,
  body: unknown,
  schema: z.ZodSchema<T>
): Promise<T> {
  const envelope = await callAiApiWithMeta(path, body, schema);
  return envelope.data;
}

export async function callAiApiRaw(path: string): Promise<unknown> {
  const res = await fetch(`${aiApiUrl}${path}`, {
    method: 'GET',
    headers: {
      'X-AI-Internal-Key': aiInternalKey,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || 'AI service request failed');
  }

  return res.json();
}

export async function enqueueIndexDocument(payload: Record<string, unknown>) {
  const res = await fetch(`${aiApiUrl}/v1/index/document`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-AI-Internal-Key': aiInternalKey,
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || 'Failed to enqueue indexing document');
  }

  return res.json();
}

export async function postAiApiRaw(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${aiApiUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-AI-Internal-Key': aiInternalKey,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || 'AI service request failed');
  }

  return res.json();
}

export async function sendLearningEvent(payload: Record<string, unknown>) {
  const res = await fetch(`${aiApiUrl}/v1/events/learning`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-AI-Internal-Key': aiInternalKey,
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || 'Failed to send learning event');
  }

  return res.json();
}
