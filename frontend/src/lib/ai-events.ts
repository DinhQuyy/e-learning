import { sendLearningEvent } from '@/lib/ai-client';

export async function sendLearningEventSafe(payload: Record<string, unknown>) {
  try {
    await sendLearningEvent(payload);
  } catch (error) {
    console.error('sendLearningEventSafe failed:', error);
  }
}