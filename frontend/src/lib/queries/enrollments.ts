import { directusUrl } from "@/lib/directus";
import type { Enrollment, Progress } from "@/types";

export async function getUserEnrollments(token: string): Promise<Enrollment[]> {
  const res = await fetch(
    `${directusUrl}/items/enrollments?fields=*,course_id.id,course_id.title,course_id.slug,course_id.thumbnail,course_id.total_lessons,course_id.total_duration,course_id.level,course_id.category_id.name,last_lesson_id.id,last_lesson_id.title,last_lesson_id.slug&sort=-date_created`,
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
  return data.data;
}

export async function getEnrollmentByCourse(
  token: string,
  courseId: string
): Promise<Enrollment | null> {
  const res = await fetch(
    `${directusUrl}/items/enrollments?filter[course_id][_eq]=${courseId}&fields=*,course_id.id,course_id.title,course_id.slug,course_id.thumbnail&limit=1`,
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
    `${directusUrl}/items/enrollments?filter[course_id][slug][_eq]=${courseSlug}&fields=*,course_id.id,course_id.title,course_id.slug,course_id.thumbnail&limit=1`,
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
    `${directusUrl}/items/progress?filter[enrollment_id][_eq]=${enrollmentId}&fields=*,lesson_id.id,lesson_id.title,lesson_id.slug`,
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
