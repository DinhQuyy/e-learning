import { directusUrl } from "@/lib/directus";
import type { Course, Enrollment } from "@/types";

type CountMap = Map<string, number>;

const clampProgress = (value: unknown): number => {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  if (numeric < 0) return 0;
  if (numeric > 100) return 100;
  return numeric;
};

async function fetchCompletedCounts(
  enrollmentIds: string[],
  token: string
): Promise<CountMap> {
  const map: CountMap = new Map();
  if (enrollmentIds.length === 0) return map;

  const res = await fetch(
    `${directusUrl}/items/progress?filter[enrollment_id][_in]=${enrollmentIds.join(",")}&filter[completed][_eq]=true&groupBy[]=enrollment_id&aggregate[count]=id`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) return map;

  const data = await res.json();
  for (const row of data.data ?? []) {
    const id =
      row.enrollment_id?.id ?? row.enrollment_id ?? row["enrollment_id"];
    const count = Number(row.count?.id ?? 0);
    if (id) map.set(String(id), count);
  }

  return map;
}

async function fetchLessonCounts(
  courseIds: string[],
  token: string
): Promise<CountMap> {
  const map: CountMap = new Map();
  if (courseIds.length === 0) return map;

  const res = await fetch(
    `${directusUrl}/items/lessons?filter[module_id.course_id][_in]=${courseIds.join(",")}&groupBy[]=module_id.course_id&aggregate[count]=id`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) return map;

  const data = await res.json();
  for (const row of data.data ?? []) {
    const courseId =
      row.module_id?.course_id ?? row["module_id.course_id"] ?? row.course_id;
    const count = Number(row.count?.id ?? 0);
    if (courseId) map.set(String(courseId), count);
  }

  return map;
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

  const [completedMap, lessonMap] = await Promise.all([
    fetchCompletedCounts(enrollmentIds, token),
    fetchLessonCounts(courseIds, token),
  ]);

  return enrollments.map((enrollment) => {
    const course = enrollment.course_id as Course | null;
    const courseId = course && typeof course === "object" ? course.id : null;

    const totalLessons =
      (courseId ? lessonMap.get(courseId) : undefined) ??
      (course && typeof course === "object"
        ? Number(course.total_lessons ?? 0)
        : 0);

    const completedLessons = completedMap.get(enrollment.id) ?? 0;

    const computedProgress =
      totalLessons && Number.isFinite(totalLessons) && totalLessons > 0
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
