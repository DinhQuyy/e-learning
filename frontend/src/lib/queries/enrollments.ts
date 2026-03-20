import { directusUrl } from "@/lib/directus";
import { ENROLLMENT_FIELDS, PROGRESS_FIELDS } from "@/lib/directus-fields";
import type { Enrollment, Progress } from "@/types";

function getCourseId(enrollment: Enrollment): string | null {
  const course = enrollment.course_id;
  if (!course) return null;
  if (typeof course === "string") return course;
  return typeof course.id === "string" ? course.id : null;
}

function dedupeLatestEnrollments(enrollments: Enrollment[]): Enrollment[] {
  const seen = new Set<string>();
  const deduped: Enrollment[] = [];

  for (const enrollment of enrollments) {
    const courseId = getCourseId(enrollment);
    const key = courseId ? `course:${courseId}` : `enrollment:${enrollment.id}`;
    if (seen.has(key)) continue;

    seen.add(key);
    deduped.push(enrollment);
  }

  return deduped;
}

function isCourseObject(value: Enrollment["course_id"]): value is NonNullable<Enrollment["course_id"]> & { id: string } {
  return Boolean(value && typeof value === "object" && typeof (value as { id?: unknown }).id === "string");
}

async function hydrateCourseRelations(
  token: string,
  enrollments: Enrollment[]
): Promise<Enrollment[]> {
  const unresolvedCourseIds = Array.from(
    new Set(
      enrollments
        .map((enrollment) =>
          typeof enrollment.course_id === "string" ? enrollment.course_id : null
        )
        .filter((id): id is string => Boolean(id))
    )
  );

  if (unresolvedCourseIds.length === 0) {
    return enrollments;
  }

  const res = await fetch(
    `${directusUrl}/items/courses?filter[id][_in]=${unresolvedCourseIds.join(",")}&fields=id,title,slug,thumbnail,total_lessons,total_duration,average_rating,level,category_id.id,category_id.name&limit=-1`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) return enrollments;

  const payload = await res.json();
  const courseRows: Array<{ id?: unknown; [key: string]: unknown }> = Array.isArray(
    payload?.data
  )
    ? (payload.data as Array<{ id?: unknown; [key: string]: unknown }>)
    : [];
  const courseMap = new Map<string, unknown>(
    courseRows
      .filter((course) => typeof course?.id === "string")
      .map((course) => [String(course.id), course])
  );

  return enrollments.map((enrollment) => {
    if (typeof enrollment.course_id !== "string") return enrollment;
    const hydrated = courseMap.get(enrollment.course_id);
    if (!hydrated) return enrollment;
    return { ...enrollment, course_id: hydrated as Enrollment["course_id"] };
  });
}

export async function getUserEnrollments(token: string): Promise<Enrollment[]> {
  const res = await fetch(
    `${directusUrl}/items/enrollments?fields=${ENROLLMENT_FIELDS}&sort=-enrolled_at,-date_created,-id`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) {
    throw new Error("Không thể tải danh sách khoá học");
  }

  const data = await res.json();
  const enrollments = (data.data ?? []) as Enrollment[];
  const deduped = dedupeLatestEnrollments(enrollments);
  const hydrated = await hydrateCourseRelations(token, deduped);

  // Hide orphan enrollments whose related course is missing/inaccessible to avoid blank cards.
  return hydrated.filter((enrollment) => isCourseObject(enrollment.course_id));
}

export async function getEnrollmentByCourse(
  token: string,
  courseId: string
): Promise<Enrollment | null> {
  const res = await fetch(
    `${directusUrl}/items/enrollments?filter[course_id][_eq]=${courseId}&fields=${ENROLLMENT_FIELDS}&sort=-enrolled_at,-date_created,-id&limit=1`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  return data.data?.[0] ?? null;
}

export async function getEnrollmentByCourseSlug(
  token: string,
  courseSlug: string
): Promise<Enrollment | null> {
  const res = await fetch(
    `${directusUrl}/items/enrollments?filter[course_id][slug][_eq]=${courseSlug}&fields=${ENROLLMENT_FIELDS}&sort=-enrolled_at,-date_created,-id&limit=1`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  return data.data?.[0] ?? null;
}

export async function getCourseProgress(
  token: string,
  enrollmentId: string
): Promise<Progress[]> {
  const res = await fetch(
    `${directusUrl}/items/progress?filter[enrollment_id][_eq]=${enrollmentId}&fields=${PROGRESS_FIELDS}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  return data.data;
}

export async function getActiveEnrollmentsCount(token: string): Promise<number> {
  const res = await fetch(
    `${directusUrl}/items/enrollments?filter[status][_eq]=active&aggregate[count]=id`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) return 0;

  const data = await res.json();
  return data.data?.[0]?.count?.id ?? 0;
}

export async function getCompletedEnrollmentsCount(token: string): Promise<number> {
  const res = await fetch(
    `${directusUrl}/items/enrollments?filter[status][_eq]=completed&aggregate[count]=id`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) return 0;

  const data = await res.json();
  return data.data?.[0]?.count?.id ?? 0;
}
