import { enqueueIndexDocument } from '@/lib/ai-client';

export type IndexVisibility = 'public' | 'enrolled_only' | 'instructor_only' | 'admin_only';

export async function enqueueIndexDocumentSafe(payload: Record<string, unknown>) {
  try {
    await enqueueIndexDocument(payload);
  } catch (error) {
    console.error('enqueueIndexDocumentSafe failed:', error);
  }
}

export async function enqueueLessonIndex(payload: {
  lessonId: string;
  title: string;
  content: string;
  courseId: string | null;
  status: string;
}) {
  const visibility: IndexVisibility = payload.status === 'published' ? 'enrolled_only' : 'instructor_only';

  await enqueueIndexDocumentSafe({
    source_type: 'course_lesson',
    source_id: payload.lessonId,
    title: payload.title,
    content: payload.content,
    course_id: payload.courseId,
    visibility,
    operation: 'upsert',
  });
}

export async function enqueueModuleIndex(payload: {
  moduleId: string;
  title: string;
  description: string;
  courseId: string | null;
}) {
  await enqueueIndexDocumentSafe({
    source_type: 'course_module',
    source_id: payload.moduleId,
    title: payload.title,
    content: payload.description || payload.title,
    course_id: payload.courseId,
    visibility: 'enrolled_only',
    operation: 'upsert',
  });
}

export async function enqueueQuizIndex(payload: {
  quizId: string;
  title: string;
  content: string;
  courseId: string | null;
}) {
  await enqueueIndexDocumentSafe({
    source_type: 'quiz',
    source_id: payload.quizId,
    title: payload.title,
    content: payload.content,
    course_id: payload.courseId,
    visibility: 'enrolled_only',
    operation: 'upsert',
  });
}

export async function enqueueDeleteIndex(sourceType: string, sourceId: string) {
  await enqueueIndexDocumentSafe({
    source_type: sourceType,
    source_id: sourceId,
    title: 'deleted',
    content: '',
    visibility: 'public',
    operation: 'delete',
  });
}