import { directusUrl } from "@/lib/directus";
import type { Certificate } from "@/types";

const CERTIFICATE_FIELDS =
  "id,certificate_code,issued_at,date_created,user_id.id,user_id.first_name,user_id.last_name,user_id.email,course_id.id,course_id.title,course_id.slug,course_id.thumbnail,enrollment_id.id,enrollment_id";
const serverToken = process.env.DIRECTUS_STATIC_TOKEN;

function buildAuthHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function fetchWithTokenFallback(
  token: string,
  url: string,
  init: RequestInit,
  retryWithServerToken: boolean
): Promise<Response | null> {
  const baseHeaders = (init.headers ?? {}) as Record<string, string>;
  const fetchWithToken = (authToken: string) =>
    fetch(url, {
      ...init,
      headers: {
        ...baseHeaders,
        ...buildAuthHeaders(authToken),
      },
    }).catch(() => null);

  const primary = await fetchWithToken(token);
  if (
    primary?.ok ||
    !retryWithServerToken ||
    !primary ||
    (primary.status !== 401 && primary.status !== 403) ||
    !serverToken ||
    serverToken === token
  ) {
    return primary;
  }

  const fallback = await fetchWithToken(serverToken);
  return fallback ?? primary;
}

function normalizeRelationId(value: unknown): string {
  if (typeof value === "string") return value;
  if (
    value &&
    typeof value === "object" &&
    "id" in value &&
    typeof (value as { id?: unknown }).id === "string"
  ) {
    return (value as { id: string }).id;
  }
  return "";
}

function buildCertificateCode(enrollmentId: string): string {
  return `EL-${enrollmentId.replace(/-/g, "").toUpperCase()}`;
}

function normalizePositiveNumber(value: unknown): number {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return numeric;
}

async function createCertificateWithFallback(
  token: string,
  payload: {
    user_id: string;
    course_id: string;
    enrollment_id: string;
    certificate_code: string;
  }
): Promise<void> {
  const createRes = await fetch(`${directusUrl}/items/certificates`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  }).catch(() => null);

  if (createRes?.ok || createRes?.status === 409) return;

  if (!serverToken || serverToken === token) return;

  await fetch(`${directusUrl}/items/certificates`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serverToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  }).catch(() => {});
}

async function fetchCompletedLessonsCount(
  token: string,
  enrollmentId: string,
  useServerTokenFallback = false
): Promise<number> {
  const res = await fetchWithTokenFallback(
    token,
    `${directusUrl}/items/progress?filter[enrollment_id][_eq]=${encodeURIComponent(
      enrollmentId
    )}&filter[completed][_eq]=true&aggregate[count]=id`,
    {
      next: { revalidate: 0 },
    },
    useServerTokenFallback
  );
  if (!res?.ok) return 0;
  const payload = await res.json().catch(() => null);
  return Number(payload?.data?.[0]?.count?.id ?? 0);
}

async function fetchPublishedLessonCountByCourse(
  token: string,
  courseId: string,
  useServerTokenFallback = false
): Promise<number> {
  if (!courseId) return 0;

  const res = await fetchWithTokenFallback(
    token,
    `${directusUrl}/items/modules?filter[course_id][_eq]=${encodeURIComponent(
      courseId
    )}&fields=course_id,lessons.id&deep[lessons][_filter][status][_eq]=published&limit=-1`,
    {
      next: { revalidate: 0 },
    },
    useServerTokenFallback
  );
  if (!res?.ok) return 0;

  const payload = await res.json().catch(() => null);
  let total = 0;
  for (const row of Array.isArray(payload?.data) ? payload.data : []) {
    const lessons = Array.isArray(row?.lessons) ? row.lessons : [];
    total += lessons.length;
  }
  return total;
}

async function ensureCertificateForEnrollment(
  token: string,
  enrollmentId: string,
  currentUserId?: string
): Promise<void> {
  if (!enrollmentId) return;
  const encodedEnrollmentId = encodeURIComponent(enrollmentId);
  const userFilter = currentUserId
    ? `&filter[user_id][_eq]=${encodeURIComponent(currentUserId)}`
    : "";
  const shouldRetryWithServerToken = Boolean(currentUserId);

  const existingRes = await fetchWithTokenFallback(
    token,
    `${directusUrl}/items/certificates?filter[enrollment_id][_eq]=${encodedEnrollmentId}${userFilter}&fields=id&limit=1`,
    {
      next: { revalidate: 0 },
    },
    shouldRetryWithServerToken
  );
  if (existingRes?.ok) {
    const existingPayload = await existingRes.json().catch(() => null);
    if (Array.isArray(existingPayload?.data) && existingPayload.data.length > 0) {
      return;
    }
  }

  const enrollmentRes = await fetchWithTokenFallback(
    token,
    `${directusUrl}/items/enrollments?filter[id][_eq]=${encodedEnrollmentId}${userFilter}&fields=id,status,progress_percentage,user_id.id,user_id,course_id.id,course_id.total_lessons,course_id&limit=1`,
    {
      next: { revalidate: 0 },
    },
    shouldRetryWithServerToken
  );
  if (!enrollmentRes?.ok) return;

  const enrollmentPayload = await enrollmentRes.json().catch(() => null);
  const enrollment = Array.isArray(enrollmentPayload?.data)
    ? enrollmentPayload.data[0]
    : null;
  const userId = normalizeRelationId(enrollment?.user_id);
  const courseId = normalizeRelationId(enrollment?.course_id);
  if (!userId || !courseId) return;
  if (currentUserId && userId !== currentUserId) return;

  const status = String(enrollment?.status ?? "");
  const storedProgress = Number(enrollment?.progress_percentage ?? 0);
  let isCompleted = status === "completed" || storedProgress >= 99.5;

  if (!isCompleted) {
    const completedLessons = await fetchCompletedLessonsCount(
      token,
      enrollmentId,
      shouldRetryWithServerToken
    );
    const countedTotalLessons = await fetchPublishedLessonCountByCourse(
      token,
      courseId,
      shouldRetryWithServerToken
    );
    const fallbackTotalLessons =
      typeof enrollment?.course_id === "object" && enrollment?.course_id
        ? normalizePositiveNumber(
            (enrollment.course_id as { total_lessons?: unknown }).total_lessons
          )
        : 0;
    const totalLessons =
      countedTotalLessons > 0 ? countedTotalLessons : fallbackTotalLessons;
    const computedProgress =
      totalLessons > 0 ? Math.min(100, Math.round((completedLessons / totalLessons) * 100)) : 0;
    isCompleted = computedProgress >= 99.5;
  }

  if (!isCompleted) return;

  await createCertificateWithFallback(token, {
    user_id: userId,
    course_id: courseId,
    enrollment_id: enrollmentId,
    certificate_code: buildCertificateCode(enrollmentId),
  });
}

export async function ensureCertificatesForCompletedEnrollments(
  token: string,
  currentUserId?: string
): Promise<void> {
  const userFilter = currentUserId
    ? `&filter[user_id][_eq]=${encodeURIComponent(currentUserId)}`
    : "";
  const enrollmentsRes = await fetch(
    `${directusUrl}/items/enrollments?fields=id,status,progress_percentage,user_id.id,user_id,course_id.id,course_id.total_lessons,course_id&limit=-1${userFilter}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    }
  );

  if (!enrollmentsRes.ok) return;

  const enrollmentPayload = await enrollmentsRes.json().catch(() => null);
  const enrollments = Array.isArray(enrollmentPayload?.data)
    ? enrollmentPayload.data
    : [];
  if (enrollments.length === 0) return;

  const enrollmentIds = enrollments
    .map((enrollment: { id?: unknown }) => String(enrollment.id ?? ""))
    .filter(Boolean);
  if (enrollmentIds.length === 0) return;

  const completedProgressRes = await fetch(
    `${directusUrl}/items/progress?filter[enrollment_id][_in]=${enrollmentIds.join(",")}&filter[completed][_eq]=true&groupBy[]=enrollment_id&aggregate[count]=id`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    }
  );
  if (!completedProgressRes.ok) return;

  const completedProgressPayload = await completedProgressRes
    .json()
    .catch(() => null);
  const completedCountByEnrollment = new Map<string, number>();
  for (const row of Array.isArray(completedProgressPayload?.data)
    ? completedProgressPayload.data
    : []) {
    const enrollmentId = normalizeRelationId(row?.enrollment_id);
    if (!enrollmentId) continue;
    const count = Number(row?.count?.id ?? 0);
    completedCountByEnrollment.set(enrollmentId, Number.isFinite(count) ? count : 0);
  }

  const courseIds = enrollments
    .map((enrollment: { course_id?: unknown }) =>
      normalizeRelationId(enrollment.course_id)
    )
    .filter(Boolean);
  if (courseIds.length === 0) return;

  const uniqueCourseIds = Array.from(new Set(courseIds));
  const lessonCountRes = await fetch(
    `${directusUrl}/items/modules?filter[course_id][_in]=${uniqueCourseIds.join(",")}&fields=course_id,lessons.id&deep[lessons][_filter][status][_eq]=published&limit=-1`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    }
  );
  if (!lessonCountRes.ok) return;

  const lessonCountPayload = await lessonCountRes.json().catch(() => null);
  const lessonCountByCourse = new Map<string, number>();
  for (const row of Array.isArray(lessonCountPayload?.data)
    ? lessonCountPayload.data
    : []) {
    const courseId = normalizeRelationId(row?.course_id);
    if (!courseId) continue;
    const lessons = Array.isArray(row?.lessons) ? row.lessons : [];
    lessonCountByCourse.set(courseId, (lessonCountByCourse.get(courseId) ?? 0) + lessons.length);
  }

  const completedEnrollments = enrollments.filter(
    (enrollment: {
      id?: unknown;
      status?: unknown;
      progress_percentage?: unknown;
      course_id?: unknown;
    }) => {
      const status = String(enrollment?.status ?? "");
      if (status === "completed") return true;

      const enrollmentId = String(enrollment?.id ?? "");
      if (!enrollmentId) return false;

      const courseId = normalizeRelationId(enrollment?.course_id);
      const completedLessons = completedCountByEnrollment.get(enrollmentId) ?? 0;
      const totalLessons =
        lessonCountByCourse.get(courseId) ??
        Number(
          (typeof enrollment?.course_id === "object" &&
          enrollment?.course_id &&
          "total_lessons" in (enrollment.course_id as object))
            ? (enrollment.course_id as { total_lessons?: unknown }).total_lessons
            : 0
        );

      const computedProgress =
        totalLessons > 0 ? Math.min(100, Math.round((completedLessons / totalLessons) * 100)) : 0;
      const storedProgress = Number(enrollment?.progress_percentage ?? 0);
      return computedProgress >= 99.5 || storedProgress >= 99.5;
    }
  );
  if (completedEnrollments.length === 0) return;

  const existingRes = await fetch(
    `${directusUrl}/items/certificates?filter[enrollment_id][_in]=${enrollmentIds.join(",")}${userFilter}&fields=id,enrollment_id.id,enrollment_id&limit=-1`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    }
  );
  if (!existingRes.ok) return;

  const existingPayload = await existingRes.json().catch(() => null);
  const existingEnrollments = new Set(
    (Array.isArray(existingPayload?.data) ? existingPayload.data : [])
      .map((certificate: { enrollment_id?: unknown }) =>
        normalizeRelationId(certificate.enrollment_id)
      )
      .filter(Boolean)
  );

  for (const enrollment of completedEnrollments) {
    const enrollmentId = String(enrollment?.id ?? "");
    if (!enrollmentId || existingEnrollments.has(enrollmentId)) continue;

    const userId = normalizeRelationId(enrollment?.user_id);
    const courseId = normalizeRelationId(enrollment?.course_id);
    if (!userId || !courseId) continue;

    await createCertificateWithFallback(token, {
      user_id: userId,
      course_id: courseId,
      enrollment_id: enrollmentId,
      certificate_code: buildCertificateCode(enrollmentId),
    });
  }
}

export async function getUserCertificates(
  token: string,
  currentUserId?: string
): Promise<Certificate[]> {
  await ensureCertificatesForCompletedEnrollments(token, currentUserId).catch(
    () => {}
  );

  const userFilter = currentUserId
    ? `&filter[user_id][_eq]=${encodeURIComponent(currentUserId)}`
    : "";
  const res = await fetchWithTokenFallback(
    token,
    `${directusUrl}/items/certificates?fields=${CERTIFICATE_FIELDS}${userFilter}&sort=-issued_at,-date_created`,
    {
      next: { revalidate: 0 },
    },
    Boolean(currentUserId)
  );

  if (!res?.ok) return [];

  const data = await res.json().catch(() => null);
  if (!Array.isArray(data?.data)) return [];

  return data.data as Certificate[];
}

export async function getUserCertificateByEnrollmentId(
  token: string,
  enrollmentId: string,
  currentUserId?: string
): Promise<Certificate | null> {
  await ensureCertificateForEnrollment(token, enrollmentId, currentUserId).catch(
    () => {}
  );

  const encodedEnrollmentId = encodeURIComponent(enrollmentId);
  const userFilter = currentUserId
    ? `&filter[user_id][_eq]=${encodeURIComponent(currentUserId)}`
    : "";
  const res = await fetchWithTokenFallback(
    token,
    `${directusUrl}/items/certificates?filter[enrollment_id][_eq]=${encodedEnrollmentId}${userFilter}&fields=${CERTIFICATE_FIELDS}&sort=-issued_at,-date_created&limit=1`,
    {
      next: { revalidate: 0 },
    },
    Boolean(currentUserId)
  );

  if (!res?.ok) return null;
  const payload = await res.json().catch(() => null);
  if (!Array.isArray(payload?.data) || payload.data.length === 0) return null;

  return payload.data[0] as Certificate;
}
