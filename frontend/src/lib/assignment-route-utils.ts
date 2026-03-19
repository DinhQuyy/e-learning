import { directusFetch, getDirectusError } from "@/lib/directus-fetch";
import { ensureEnrollment } from "@/lib/ai-auth";

export const ASSIGNMENT_LIST_FIELDS = [
  "id",
  "title",
  "instructions",
  "due_at",
  "max_score",
  "status",
  "date_created",
  "date_updated",
  "lesson_id.id",
  "lesson_id.title",
  "lesson_id.slug",
  "rubric.id",
  "rubric.title",
  "rubric.criteria.id",
  "rubric.criteria.title",
  "rubric.criteria.description",
  "rubric.criteria.max_points",
  "rubric.criteria.scoring_guidance",
  "rubric.criteria.sort",
  "submissions.id",
  "submissions.status",
  "submissions.submitted_at",
  "submissions.reviewed_at",
  "submissions.user_id.id",
  "submissions.user_id.first_name",
  "submissions.user_id.last_name",
  "submissions.user_id.email",
  "submissions.review.id",
  "submissions.review.status",
  "submissions.review.final_score",
].join(",");

export const ASSIGNMENT_DETAIL_FIELDS = [
  ASSIGNMENT_LIST_FIELDS,
  "submissions.body_text",
  "submissions.reference_url",
  "submissions.ai_artifacts.id",
  "submissions.ai_artifacts.applied_state",
  "submissions.ai_artifacts.date_created",
  "submissions.review.reviewer_id.id",
  "submissions.review.reviewer_id.first_name",
  "submissions.review.reviewer_id.last_name",
  "submissions.review.criterion_scores",
  "submissions.review.final_feedback",
].join(",");

export function asArray<T>(value: T[] | T | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

export function getDirectusItemId(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === "string" ? id : null;
  }
  return null;
}

export function normalizeCriterionScores(
  scores: unknown
): Array<{
  criterion_id: string;
  title: string;
  max_points: number;
  score: number;
  rationale?: string | null;
}> {
  if (!Array.isArray(scores)) return [];
  return scores
    .map((entry) => {
      const row = entry as Record<string, unknown>;
      const criterionId = String(row.criterion_id ?? "").trim();
      const title = String(row.title ?? "").trim();
      const maxPoints = Number(row.max_points ?? 0);
      const score = Number(row.score ?? 0);
      if (!criterionId || !title || !Number.isFinite(maxPoints) || !Number.isFinite(score)) {
        return null;
      }
      return {
        criterion_id: criterionId,
        title,
        max_points: maxPoints,
        score,
        rationale: row.rationale ? String(row.rationale) : null,
      };
    })
    .filter(
      (
        value
      ): value is {
        criterion_id: string;
        title: string;
        max_points: number;
        score: number;
        rationale: string | null;
      } => value !== null
    );
}

export function sumCriterionScores(
  scores: Array<{ score: number }>
): number {
  const total = scores.reduce((acc, item) => acc + Number(item.score || 0), 0);
  return Math.round(total * 100) / 100;
}

export async function verifyInstructorCourseOwnership(
  userId: string,
  courseId: string
): Promise<boolean> {
  const res = await directusFetch(
    `/items/courses_instructors?filter[course_id][_eq]=${encodeURIComponent(
      courseId
    )}&filter[user_id][_eq]=${encodeURIComponent(userId)}&limit=1&fields=id`
  );
  if (!res.ok) return false;
  const payload = await res.json().catch(() => null);
  return Array.isArray(payload?.data) && payload.data.length > 0;
}

export async function getLessonCourseInfo(
  lessonId: string
): Promise<{ lessonId: string; courseId: string; lessonTitle: string; courseTitle: string } | null> {
  const res = await directusFetch(
    `/items/lessons/${encodeURIComponent(
      lessonId
    )}?fields=id,title,module_id.course_id.id,module_id.course_id.title`
  );
  if (!res.ok) return null;
  const payload = await res.json().catch(() => null);
  const lesson = payload?.data;
  const courseId = lesson?.module_id?.course_id?.id;
  if (!lesson?.id || !courseId) return null;
  return {
    lessonId: String(lesson.id),
    courseId: String(courseId),
    lessonTitle: String(lesson.title ?? ""),
    courseTitle: String(lesson?.module_id?.course_id?.title ?? ""),
  };
}

export async function ensureStudentHasLessonAccess(
  userId: string,
  lessonId: string
): Promise<{ courseId: string; lessonTitle: string; courseTitle: string } | null> {
  const lessonInfo = await getLessonCourseInfo(lessonId);
  if (!lessonInfo) return null;
  const enrolled = await ensureEnrollment(userId, lessonInfo.courseId);
  if (!enrolled) return null;
  return {
    courseId: lessonInfo.courseId,
    lessonTitle: lessonInfo.lessonTitle,
    courseTitle: lessonInfo.courseTitle,
  };
}

export async function fetchAssignmentListForCourse(courseId: string): Promise<unknown[]> {
  const res = await directusFetch(
    `/items/assignments?filter[lesson_id][module_id][course_id][_eq]=${encodeURIComponent(
      courseId
    )}&fields=${ASSIGNMENT_LIST_FIELDS}&sort=-date_created,-id&limit=-1`
  );
  if (!res.ok) {
    throw new Error(await getDirectusError(res, "Không thể tải danh sách bài tập."));
  }
  const payload = await res.json().catch(() => null);
  return Array.isArray(payload?.data) ? payload.data : [];
}

export async function fetchAssignmentById(assignmentId: string): Promise<Record<string, unknown> | null> {
  const res = await directusFetch(
    `/items/assignments/${encodeURIComponent(assignmentId)}?fields=${ASSIGNMENT_DETAIL_FIELDS}`
  );
  if (!res.ok) return null;
  const payload = await res.json().catch(() => null);
  return payload?.data ?? null;
}
