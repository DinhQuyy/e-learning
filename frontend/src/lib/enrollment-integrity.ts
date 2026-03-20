import { directusUrl } from "@/lib/directus";
import { directusFetch } from "@/lib/directus-fetch";

type EnrollmentRecord = {
  id: string;
  user_id?: string | { id?: string } | null;
  course_id?: string | { id?: string } | null;
  status?: string;
  progress_percentage?: number;
  last_lesson_id?: string | { id?: string } | null;
  completed_at?: string | null;
  enrolled_at?: string | null;
  date_created?: string | null;
  [key: string]: unknown;
};

interface CreateOrGetEnrollmentParams {
  userId: string;
  courseId: string;
  status?: string;
  progressPercentage?: number;
}

export interface CreateOrGetEnrollmentResult {
  enrollment: EnrollmentRecord | null;
  created: boolean;
  duplicatesRemoved: number;
}

type OrderRow = {
  items?: Array<{
    course_id?: string | { id?: string | null } | null;
  }> | null;
};

function toTimestamp(value: unknown): number {
  if (typeof value !== "string" || value.length === 0) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function compareNewest(a: EnrollmentRecord, b: EnrollmentRecord): number {
  const aTime = Math.max(
    toTimestamp(a.enrolled_at),
    toTimestamp(a.date_created)
  );
  const bTime = Math.max(
    toTimestamp(b.enrolled_at),
    toTimestamp(b.date_created)
  );

  if (aTime !== bTime) return bTime - aTime;
  return String(b.id).localeCompare(String(a.id));
}

async function directusServerFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const staticToken = process.env.DIRECTUS_STATIC_TOKEN;
  if (!staticToken) {
    return directusFetch(
      path,
      options as unknown as Parameters<typeof directusFetch>[1]
    );
  }

  const url = path.startsWith("http") ? path : `${directusUrl}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
    Authorization: `Bearer ${staticToken}`,
  };

  const response = await fetch(url, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (response.status === 401 || response.status === 403) {
    return directusFetch(
      path,
      options as unknown as Parameters<typeof directusFetch>[1]
    );
  }

  return response;
}

async function listEnrollmentsByUserCourse(
  userId: string,
  courseId: string
): Promise<EnrollmentRecord[]> {
  const encodedUserId = encodeURIComponent(userId);
  const encodedCourseId = encodeURIComponent(courseId);
  const query =
    `/items/enrollments?filter[user_id][_eq]=${encodedUserId}` +
    `&filter[course_id][_eq]=${encodedCourseId}` +
    "&fields=id,user_id,course_id,status,progress_percentage,last_lesson_id,completed_at,enrolled_at,date_created" +
    "&sort=-enrolled_at,-date_created,-id&limit=-1";

  const res = await directusServerFetch(query);
  if (!res.ok) return [];

  const data = await res.json();
  const rows = Array.isArray(data?.data) ? data.data : [];
  return rows as EnrollmentRecord[];
}

async function removeDuplicateEnrollments(
  enrollments: EnrollmentRecord[],
  preferredId?: string | null
): Promise<{ keeper: EnrollmentRecord | null; removedCount: number }> {
  if (enrollments.length === 0) return { keeper: null, removedCount: 0 };

  const sorted = [...enrollments].sort(compareNewest);
  const preferred = preferredId
    ? sorted.find((enrollment) => enrollment.id === preferredId)
    : null;
  const keeper = preferred ?? sorted[0];
  const duplicates = sorted.filter((enrollment) => enrollment.id !== keeper.id);

  if (duplicates.length === 0) {
    return { keeper, removedCount: 0 };
  }

  const deleteResults = await Promise.all(
    duplicates.map(async (enrollment) => {
      const id = encodeURIComponent(String(enrollment.id));
      const res = await directusServerFetch(`/items/enrollments/${id}`, {
        method: "DELETE",
      });
      return res.ok || res.status === 404;
    })
  );

  return {
    keeper,
    removedCount: deleteResults.filter(Boolean).length,
  };
}

async function tryReadErrorMessage(response: Response): Promise<string | null> {
  try {
    const data = await response.json();
    const message = data?.errors?.[0]?.message;
    return typeof message === "string" && message.length > 0 ? message : null;
  } catch {
    return null;
  }
}

async function hasSuccessfulOrderForCourse(
  userId: string,
  courseId: string
): Promise<boolean> {
  const encodedUserId = encodeURIComponent(userId);
  const query =
    `/items/orders?filter[user_id][_eq]=${encodedUserId}` +
    "&filter[status][_eq]=success" +
    "&fields=id,items.course_id.id" +
    "&sort=-paid_at,-date_created,-id&limit=50";

  const res = await directusServerFetch(query);
  if (!res.ok) return false;

  const data = await res.json().catch(() => null);
  const rows = Array.isArray(data?.data) ? (data.data as OrderRow[]) : [];

  return rows.some((row) =>
    (row.items ?? []).some((item) => {
      const orderedCourseId =
        typeof item?.course_id === "object"
          ? item.course_id?.id
          : item?.course_id;
      return String(orderedCourseId ?? "") === courseId;
    })
  );
}

export async function createOrGetEnrollment(
  params: CreateOrGetEnrollmentParams
): Promise<CreateOrGetEnrollmentResult> {
  const { userId, courseId, status = "active", progressPercentage = 0 } = params;

  const existing = await listEnrollmentsByUserCourse(userId, courseId);
  if (existing.length > 0) {
    const collapsed = await removeDuplicateEnrollments(existing);
    return {
      enrollment: collapsed.keeper,
      created: false,
      duplicatesRemoved: collapsed.removedCount,
    };
  }

  const createRes = await directusServerFetch("/items/enrollments", {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      course_id: courseId,
      status,
      progress_percentage: progressPercentage,
      enrolled_at: new Date().toISOString(),
    }),
  });

  if (createRes.ok) {
    const createdData = await createRes.json();
    const createdEnrollment = (createdData?.data ?? null) as EnrollmentRecord | null;
    const afterCreate = await listEnrollmentsByUserCourse(userId, courseId);
    const collapsed = await removeDuplicateEnrollments(
      afterCreate,
      createdEnrollment?.id
    );

    return {
      enrollment: collapsed.keeper ?? createdEnrollment,
      created: true,
      duplicatesRemoved: collapsed.removedCount,
    };
  }

  // Race fallback: another request may have created the enrollment first.
  const afterFailure = await listEnrollmentsByUserCourse(userId, courseId);
  if (afterFailure.length > 0) {
    const collapsed = await removeDuplicateEnrollments(afterFailure);
    return {
      enrollment: collapsed.keeper,
      created: false,
      duplicatesRemoved: collapsed.removedCount,
    };
  }

  const message =
    (await tryReadErrorMessage(createRes)) ?? "Không thể đăng ký khoá học";
  throw new Error(message);
}

export async function ensureEnrollmentFromSuccessfulOrder(
  userId: string,
  courseId: string
): Promise<EnrollmentRecord | null> {
  const existing = await listEnrollmentsByUserCourse(userId, courseId);
  if (existing.length > 0) {
    const collapsed = await removeDuplicateEnrollments(existing);
    return collapsed.keeper;
  }

  const hasSuccessfulOrder = await hasSuccessfulOrderForCourse(userId, courseId);
  if (!hasSuccessfulOrder) return null;

  const result = await createOrGetEnrollment({
    userId,
    courseId,
  });

  return result.enrollment;
}

export async function dedupeEnrollmentsByUserCourse(
  userId: string,
  courseId: string
): Promise<{ kept: EnrollmentRecord | null; removedCount: number }> {
  const rows = await listEnrollmentsByUserCourse(userId, courseId);
  const collapsed = await removeDuplicateEnrollments(rows);
  return {
    kept: collapsed.keeper,
    removedCount: collapsed.removedCount,
  };
}
