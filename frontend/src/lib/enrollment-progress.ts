import { directusUrl } from "@/lib/directus";
import type { Course, Enrollment } from "@/types";

type CountMap = Map<string, number>;
type CountResult = { map: CountMap; success: boolean };

const clampProgress = (value: unknown): number => {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  if (numeric < 0) return 0;
  if (numeric > 100) return 100;
  return numeric;
};

function getAuthHeaders(token: string): Record<string, string> {
  // Server token fallback avoids permission gaps for aggregate lesson queries.
  const authToken = process.env.DIRECTUS_STATIC_TOKEN ?? token;
  return {
    Authorization: `Bearer ${authToken}`,
    "Content-Type": "application/json",
  };
}

async function fetchCompletedCounts(
  enrollmentIds: string[],
  token: string
): Promise<CountResult> {
  const map: CountMap = new Map();
  if (enrollmentIds.length === 0) return { map, success: true };

  try {
    const res = await fetch(
      `${directusUrl}/items/progress?filter[enrollment_id][_in]=${enrollmentIds.join(",")}&filter[completed][_eq]=true&groupBy[]=enrollment_id&aggregate[count]=id`,
      {
        headers: getAuthHeaders(token),
        next: { revalidate: 0 },
      }
    );

    if (!res.ok) return { map, success: false };

    const data = await res.json();
    for (const row of data.data ?? []) {
      const id =
        row.enrollment_id?.id ?? row.enrollment_id ?? row["enrollment_id"];
      const count = Number(row.count?.id ?? 0);
      if (id) map.set(String(id), count);
    }

    return { map, success: true };
  } catch {
    return { map, success: false };
  }
}

async function fetchLessonCounts(
  courseIds: string[],
  token: string
): Promise<CountResult> {
  const map: CountMap = new Map();
  if (courseIds.length === 0) return { map, success: true };
  const uniqueCourseIds = Array.from(
    new Set(courseIds.map((id) => String(id)).filter(Boolean))
  );
  const joinedCourseIds = uniqueCourseIds.join(",");

  try {
    const res = await fetch(
      `${directusUrl}/items/modules?filter[course_id][_in]=${joinedCourseIds}&fields=course_id,lessons.id&deep[lessons][_filter][status][_eq]=published&limit=-1`,
      {
        headers: getAuthHeaders(token),
        next: { revalidate: 0 },
      }
    );

    if (!res.ok) return { map, success: false };

    const data = await res.json();
    for (const moduleRow of data.data ?? []) {
      const courseId = moduleRow.course_id?.id ?? moduleRow.course_id;
      if (!courseId) continue;

      const key = String(courseId);
      const lessons = Array.isArray(moduleRow.lessons) ? moduleRow.lessons : [];
      map.set(key, (map.get(key) ?? 0) + lessons.length);
    }

    return { map, success: true };
  } catch {
    return { map, success: false };
  }
}

export async function recalcEnrollmentsProgress(
  enrollments: Enrollment[],
  token: string
): Promise<Enrollment[]> {
  const enrollmentIds = enrollments.map((e) => e.id).filter(Boolean);
  const courseIds = enrollments
    .map((e) =>
      typeof e.course_id === "object" && e.course_id
        ? (e.course_id as Course).id
        : null
    )
    .filter(Boolean) as string[];

  const [completedResult, lessonResult] = await Promise.all([
    fetchCompletedCounts(enrollmentIds, token),
    fetchLessonCounts(courseIds, token),
  ]);

  return enrollments.map((enrollment) => {
    const course = enrollment.course_id as Course | null;
    const courseId = course && typeof course === "object" ? course.id : null;

    const totalLessons =
      (courseId && lessonResult.success
        ? lessonResult.map.get(courseId)
        : undefined) ??
      (course && typeof course === "object"
        ? Number(course.total_lessons ?? 0)
        : 0);

    const completedLessons =
      completedResult.map.has(enrollment.id)
        ? completedResult.map.get(enrollment.id) ?? 0
        : completedResult.success
          ? 0
          : null;

    const computedProgress =
      completedLessons !== null &&
      totalLessons &&
      Number.isFinite(totalLessons) &&
      totalLessons > 0
        ? Math.min(100, Math.round((completedLessons / totalLessons) * 100))
        : null;

    const progress = clampProgress(
      computedProgress !== null ? computedProgress : enrollment.progress_percentage
    );

    let status = enrollment.status;
    if (status !== "cancelled") {
      status = progress >= 99.5 ? "completed" : "active";
    }

    return {
      ...enrollment,
      progress_percentage: progress,
      status,
    };
  });
}
