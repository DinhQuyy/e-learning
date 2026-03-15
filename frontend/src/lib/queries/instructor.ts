import { directusUrl } from "@/lib/directus";
import { postAiApiRaw } from "@/lib/ai-client";
import {
  instructorRiskResponseSchema,
  mentorAnalyticsResponseSchema,
} from "@/lib/ai-schemas";
import { z } from "zod";
import type { Course, Enrollment, Review, DirectusUser } from "@/types";

interface InstructorStats {
  totalCourses: number;
  totalStudents: number;
  averageRating: number;
  totalRevenue: number;
}

interface InstructorCourse extends Course {
  enrollment_count: number;
  review_count: number;
}

export interface CourseStudent {
  id: string;
  user: DirectusUser;
  enrolled_at: string;
  progress_percentage: number;
  status: string;
  last_accessed: string | null;
}

export interface InstructorAtRiskStudent {
  enrollment_id: string;
  user: DirectusUser;
  course: Course;
  progress_percentage: number;
  risk_score: number;
  risk_band: "low" | "medium" | "high";
  inactive_days: number;
  failed_quiz_attempts_7d: number;
  streak_days: number;
  last_activity_at: string | null;
  recommended_action: string;
}

export interface InstructorMentorAnalytics {
  lookback_days: number;
  shown: number;
  clicked: number;
  dismissed: number;
  completed: number;
  ctr: number;
  completion_rate: number;
  clicked_completion_rate: number;
  non_clicked_completion_rate: number;
  completion_lift_pp: number;
  completion_lift_ratio: number;
  interventions_sent: number;
  notification_interventions: number;
  email_interventions: number;
}

type CountResult = { map: Map<string, number>; success: boolean };
const IN_FILTER_CHUNK_SIZE = 60;
const RATING_STARS = [1, 2, 3, 4, 5] as const;

function chunkIds(ids: string[], chunkSize: number = IN_FILTER_CHUNK_SIZE): string[][] {
  const unique = Array.from(new Set(ids.map((id) => String(id)).filter(Boolean)));
  if (unique.length === 0) return [];

  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += chunkSize) {
    chunks.push(unique.slice(i, i + chunkSize));
  }
  return chunks;
}

function getEnrollmentUserId(enrollment: Enrollment): string | null {
  const user = enrollment.user_id as DirectusUser | string | null | undefined;
  if (!user) return null;
  return typeof user === "object" ? String(user.id ?? "") || null : String(user);
}

function getEnrollmentCourseId(enrollment: Enrollment): string | null {
  const course = enrollment.course_id as Course | string | null | undefined;
  if (!course) return null;
  return typeof course === "object"
    ? String((course as Course).id ?? "") || null
    : String(course);
}

function dedupeEnrollmentsByUserCourse(enrollments: Enrollment[]): Enrollment[] {
  const seen = new Set<string>();
  const deduped: Enrollment[] = [];

  for (const enrollment of enrollments) {
    const userId = getEnrollmentUserId(enrollment);
    const courseId = getEnrollmentCourseId(enrollment);
    const key =
      userId && courseId
        ? `${userId}:${courseId}`
        : `enrollment:${String(enrollment.id)}`;

    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(enrollment);
  }

  return deduped;
}

function createEmptyRatingDistribution(): Record<number, number> {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
}

function daysBetween(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return 0;
  const diffMs = Date.now() - parsed;
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
}

function normalizeRating(rawRating: unknown): number | null {
  const parsed = Number(rawRating);
  if (!Number.isFinite(parsed)) return null;
  const rating = Math.round(parsed);
  return rating >= 1 && rating <= 5 ? rating : null;
}

function getAuthHeaders(token: string) {
  const serverToken = process.env.DIRECTUS_STATIC_TOKEN;
  return {
    Authorization: `Bearer ${serverToken ?? token}`,
    "Content-Type": "application/json",
  };
}

async function getCompletedLessonsByEnrollment(
  enrollmentIds: string[],
  token: string
): Promise<CountResult> {
  if (enrollmentIds.length === 0) {
    return { map: new Map(), success: true };
  }

  try {
    const res = await fetch(
      `${directusUrl}/items/progress?filter[enrollment_id][_in]=${enrollmentIds.join(",")}&filter[completed][_eq]=true&groupBy[]=enrollment_id&aggregate[count]=id`,
      { headers: getAuthHeaders(token), next: { revalidate: 0 } }
    );

    if (!res.ok) return { map: new Map(), success: false };

    const data = await res.json();
    const map = new Map<string, number>();
    for (const item of data.data ?? []) {
      const enrollmentId =
        item.enrollment_id?.id ?? item.enrollment_id ?? item["enrollment_id"];
      if (enrollmentId) {
        map.set(String(enrollmentId), Number(item.count?.id ?? 0));
      }
    }

    return { map, success: true };
  } catch {
    return { map: new Map(), success: false };
  }
}

async function getLessonCountsByCourse(
  courseIds: string[],
  token: string
): Promise<CountResult> {
  if (courseIds.length === 0) {
    return { map: new Map(), success: true };
  }

  const headers = getAuthHeaders(token);
  const result: CountResult = { map: new Map(), success: false };
  const uniqueCourseIds = Array.from(
    new Set(courseIds.map((id) => String(id)).filter(Boolean))
  );

  try {
    const res = await fetch(
      `${directusUrl}/items/modules?filter[course_id][_in]=${uniqueCourseIds.join(",")}&fields=course_id,lessons.id&deep[lessons][_filter][status][_eq]=published&limit=-1`,
      { headers, next: { revalidate: 0 } }
    );

    if (!res.ok) return result;

    const data = await res.json();
    for (const moduleRow of data.data ?? []) {
      const courseId = moduleRow.course_id?.id ?? moduleRow.course_id;
      if (!courseId) continue;

      const key = String(courseId);
      const lessons = Array.isArray(moduleRow.lessons) ? moduleRow.lessons : [];
      result.map.set(key, (result.map.get(key) ?? 0) + lessons.length);
    }

    result.success = true;
  } catch {
    // ignore
  }

  return result;
}

async function fetchUsersByIds(
  userIds: string[],
  token: string
): Promise<Map<string, DirectusUser>> {
  const map = new Map<string, DirectusUser>();
  if (userIds.length === 0) return map;

  const res = await fetch(
    `${directusUrl}/users?filter[id][_in]=${userIds.join(
      ","
    )}&fields=id,first_name,last_name,email,avatar,status,phone,headline,bio,social_links,date_created,role.id,role.name`,
    {
      headers: getAuthHeaders(token),
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) return map;

  const data = await res.json();
  for (const user of data.data ?? []) {
    if (user?.id) {
      map.set(String(user.id), user as DirectusUser);
    }
  }

  return map;
}

async function getInstructorRevenueByCourseIds(
  courseIds: string[],
  token: string
): Promise<number> {
  const chunks = chunkIds(courseIds);
  if (chunks.length === 0) return 0;

  let totalRevenue = 0;

  for (const chunk of chunks) {
    const params = new URLSearchParams();
    params.set("filter[course_id][_in]", chunk.join(","));
    params.set("filter[order_id][status][_eq]", "success");
    params.append("aggregate[sum]", "price");

    try {
      const res = await fetch(`${directusUrl}/items/order_items?${params.toString()}`, {
        headers: getAuthHeaders(token),
        next: { revalidate: 0 },
      });

      if (!res.ok) continue;

      const data = await res.json();
      const sumValue = data?.data?.[0]?.sum?.price ?? 0;
      const revenue = Number(sumValue);
      if (Number.isFinite(revenue)) {
        totalRevenue += revenue;
      }
    } catch {
      // keep best-effort behavior and continue other chunks
    }
  }

  return totalRevenue;
}

async function getDistinctStudentsByCourseIds(
  courseIds: string[],
  token: string
): Promise<number> {
  const chunks = chunkIds(courseIds);
  if (chunks.length === 0) return 0;

  const headers = getAuthHeaders(token);
  const uniqueUserIds = new Set<string>();

  await Promise.all(
    chunks.map(async (chunk) => {
      const params = new URLSearchParams();
      params.set("filter[course_id][_in]", chunk.join(","));
      params.set("filter[status][_neq]", "cancelled");
      params.append("groupBy[]", "user_id");
      params.append("aggregate[count]", "id");
      params.set("limit", "-1");

      try {
        const res = await fetch(`${directusUrl}/items/enrollments?${params.toString()}`, {
          headers,
          next: { revalidate: 0 },
        });

        if (!res.ok) return;

        const payload = await res.json();
        for (const row of payload?.data ?? []) {
          const userId =
            typeof row?.user_id === "string"
              ? row.user_id
              : row?.user_id?.id
                ? String(row.user_id.id)
                : null;
          if (userId) {
            uniqueUserIds.add(userId);
          }
        }
      } catch {
        // keep best-effort behavior and continue other chunks
      }
    })
  );

  return uniqueUserIds.size;
}

async function enrichEnrollments(
  enrollments: Enrollment[],
  token: string
): Promise<Enrollment[]> {
  if (enrollments.length === 0) return [];

  const enrollmentIds = enrollments.map((e) => e.id).filter(Boolean);
  const userIds = Array.from(
    new Set(
      enrollments
        .map((e) =>
          typeof e.user_id === "object"
            ? (e.user_id as DirectusUser)?.id
            : e.user_id
        )
        .filter(Boolean) as string[]
    )
  );
  const courseIds = Array.from(
    new Set(
      enrollments
        .map((e) => {
          const course = e.course_id as Course | string | null | undefined;
          if (!course) return null;
          return typeof course === "object" ? course.id : course;
        })
        .filter(Boolean) as string[]
    )
  );

  const [userMap, completedResult, lessonResult] = await Promise.all([
    fetchUsersByIds(userIds, token),
    getCompletedLessonsByEnrollment(enrollmentIds, token),
    getLessonCountsByCourse(courseIds, token),
  ]);

  return enrollments.map((enrollment) => {
    const course = enrollment.course_id as Course | string | null | undefined;
    const courseId =
      course && typeof course === "object"
        ? course.id
        : (course as string | undefined);

    const totalLessonsRaw =
      (courseId && lessonResult.map.get(courseId)) ??
      (course && typeof course === "object"
        ? Number((course as Course).total_lessons ?? 0)
        : 0);
    const totalLessons = Number(totalLessonsRaw);

    const completedLessons =
      completedResult.map.get(enrollment.id) ??
      (completedResult.success ? 0 : null);

    const computedProgress =
      completedLessons !== null &&
      Number.isFinite(totalLessons) &&
      totalLessons > 0
        ? Math.min(100, Math.round((completedLessons / totalLessons) * 100))
        : null;

    const storedProgress = Math.round(
      Number(enrollment.progress_percentage ?? 0)
    );

    const finalProgress =
      computedProgress !== null && Number.isFinite(computedProgress)
        ? computedProgress
        : storedProgress;

    const finalStatus =
      computedProgress !== null
        ? computedProgress >= 100
          ? "completed"
          : "active"
        : enrollment.status;

    const userId =
      typeof enrollment.user_id === "object"
        ? (enrollment.user_id as DirectusUser)?.id
        : (enrollment.user_id as string);
    const hydratedUser =
      (userId && userMap.get(String(userId))) ?? enrollment.user_id;

    return {
      ...enrollment,
      user_id: hydratedUser,
      progress_percentage: finalProgress,
      status: finalStatus,
    };
  });
}

async function fetchInstructorRiskRows(
  courseIds: string[],
  limit: number
): Promise<Map<string, z.infer<typeof instructorRiskResponseSchema>["items"][number]>> {
  const map = new Map<
    string,
    z.infer<typeof instructorRiskResponseSchema>["items"][number]
  >();

  if (courseIds.length === 0) return map;

  try {
    const raw = await postAiApiRaw("/v1/instructor/risk", {
      course_ids: courseIds,
      limit,
    });
    const parsed = instructorRiskResponseSchema.safeParse(raw);
    if (!parsed.success) {
      return map;
    }

    for (const item of parsed.data.items) {
      map.set(`${item.user_id}:${item.course_id}`, item);
    }
  } catch {
    // keep dashboard best-effort
  }

  return map;
}

async function fetchMentorAnalyticsRows(
  courseIds: string[],
  lookbackDays: number
): Promise<InstructorMentorAnalytics | null> {
  try {
    const raw = await postAiApiRaw("/v1/mentor/analytics", {
      course_ids: courseIds,
      lookback_days: lookbackDays,
    });
    const parsed = mentorAnalyticsResponseSchema.safeParse(raw);
    if (!parsed.success) {
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function fallbackRiskForEnrollment(
  enrollment: Enrollment
): Omit<InstructorAtRiskStudent, "enrollment_id" | "user" | "course" | "progress_percentage"> {
  const progress = Number(enrollment.progress_percentage ?? 0);
  const inactiveDays = daysBetween(enrollment.enrolled_at ?? enrollment.date_created ?? null);

  let riskScore = 8;
  let riskBand: InstructorAtRiskStudent["risk_band"] = "low";
  let recommendedAction = "Theo dõi thêm trước khi can thiệp mạnh.";

  if (progress <= 0 && inactiveDays >= 14) {
    riskScore = 72;
    riskBand = "high";
    recommendedAction = "Can thiệp khởi động lại khóa học ngay trong tuần này.";
  } else if (progress <= 10 && inactiveDays >= 7) {
    riskScore = 58;
    riskBand = "medium";
    recommendedAction = "Đẩy micro-plan 15-20 phút để kéo học viên quay lại.";
  } else if (progress < 30 && inactiveDays >= 3) {
    riskScore = 42;
    riskBand = "medium";
    recommendedAction = "Nhắc học viên hoàn thành bài tiếp theo để giữ nhịp.";
  }

  return {
    risk_score: riskScore,
    risk_band: riskBand,
    inactive_days: inactiveDays,
    failed_quiz_attempts_7d: 0,
    streak_days: 0,
    last_activity_at: null,
    recommended_action: recommendedAction,
  };
}

export async function getInstructorCourses(
  token: string
): Promise<InstructorCourse[]> {
  // First get junction records to find instructor's courses
  const junctionRes = await fetch(
    `${directusUrl}/items/courses_instructors?filter[user_id][_eq]=$CURRENT_USER&fields=course_id&limit=-1`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    }
  );

  if (!junctionRes.ok) return [];

  const junctionData = await junctionRes.json();
  const junctionRows: Array<{ course_id?: string | { id?: string } | null }> =
    Array.isArray(junctionData?.data)
      ? (junctionData.data as Array<{ course_id?: string | { id?: string } | null }>)
      : [];

  const courseIds: string[] = Array.from(
    new Set(
      junctionRows
        .map(
          (j) =>
            typeof j.course_id === "string"
              ? j.course_id
              : j.course_id?.id
                ? String(j.course_id.id)
                : ""
        )
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    )
  );

  if (courseIds.length === 0) return [];

  const headers = getAuthHeaders(token);
  const courseIdChunks = chunkIds(courseIds);

  // Fetch courses with related data (chunked to avoid long query strings)
  const courseChunkResults = await Promise.all(
    courseIdChunks.map(async (chunk) => {
      const params = new URLSearchParams();
      params.set("filter[id][_in]", chunk.join(","));
      params.set("fields", "*,category_id.id,category_id.name");
      params.set("sort", "-date_created");
      params.set("limit", "-1");

      const res = await fetch(`${directusUrl}/items/courses?${params.toString()}`, {
        headers,
        next: { revalidate: 0 },
      });

      if (!res.ok) return [] as Course[];
      const payload = await res.json();
      return (payload?.data ?? []) as Course[];
    })
  );

  const courses = courseChunkResults
    .flat()
    .sort((a, b) => {
      const aTime = Date.parse(String(a.date_created ?? ""));
      const bTime = Date.parse(String(b.date_created ?? ""));
      if (!Number.isFinite(aTime) || !Number.isFinite(bTime)) return 0;
      return bTime - aTime;
    });

  if (courses.length === 0) return [];

  const enrollmentMap: Record<string, number> = {};
  await Promise.all(
    courseIdChunks.map(async (chunk) => {
      const params = new URLSearchParams();
      params.set("filter[course_id][_in]", chunk.join(","));
      params.set("filter[status][_neq]", "cancelled");
      params.append("groupBy[]", "course_id");
      params.append("aggregate[countDistinct]", "user_id");

      const res = await fetch(`${directusUrl}/items/enrollments?${params.toString()}`, {
        headers,
        next: { revalidate: 0 },
      });

      if (!res.ok) return;

      const payload = await res.json();
      for (const item of payload?.data ?? []) {
        const courseId =
          typeof item.course_id === "string"
            ? item.course_id
            : item.course_id?.id
              ? String(item.course_id.id)
              : null;
        if (!courseId) continue;
        enrollmentMap[courseId] = Number(
          item.countDistinct?.user_id ??
            item.countdistinct?.user_id ??
            item.count?.id ??
            0
        );
      }
    })
  );

  const reviewMap: Record<string, { count: number; avg: number }> = {};
  await Promise.all(
    courseIdChunks.map(async (chunk) => {
      const params = new URLSearchParams();
      params.set("filter[status][_eq]", "approved");
      params.set("filter[course_id][_in]", chunk.join(","));
      params.append("groupBy[]", "course_id");
      params.append("aggregate[count]", "id");
      params.append("aggregate[avg]", "rating");

      const res = await fetch(`${directusUrl}/items/reviews?${params.toString()}`, {
        headers,
        next: { revalidate: 0 },
      });

      if (!res.ok) return;

      const payload = await res.json();
      for (const item of payload?.data ?? []) {
        const courseId =
          typeof item.course_id === "string"
            ? item.course_id
            : item.course_id?.id
              ? String(item.course_id.id)
              : null;
        if (!courseId) continue;

        reviewMap[courseId] = {
          count: Number(item.count?.id ?? 0),
          avg: parseFloat(item.avg?.rating ?? "0"),
        };
      }
    })
  );

  return courses.map((course) => ({
    ...course,
    enrollment_count: enrollmentMap[course.id] ?? 0,
    review_count: reviewMap[course.id]?.count ?? 0,
    average_rating: reviewMap[course.id]?.avg ?? 0,
  }));
}

export async function getInstructorStats(
  token: string
): Promise<InstructorStats> {
  const courses = await getInstructorCourses(token);
  const activeCourses = courses.filter((course) => course.status !== "archived");
  const scopedCourses = activeCourses.length > 0 ? activeCourses : courses;
  const scopedCourseIds = scopedCourses.map((course) => course.id);
  const revenueCourseIds = courses.map((course) => course.id);

  const totalCourses = scopedCourses.length;
  const totalStudents = await getDistinctStudentsByCourseIds(scopedCourseIds, token);

  const coursesWithRating = scopedCourses.filter(
    (c) => Number(c.review_count ?? 0) > 0 && Number(c.average_rating ?? 0) > 0
  );
  const averageRating =
    coursesWithRating.length > 0
      ? coursesWithRating.reduce(
          (acc, c) => acc + Number(c.average_rating ?? 0) * Number(c.review_count ?? 0),
          0
        ) /
        coursesWithRating.reduce((acc, c) => acc + Number(c.review_count ?? 0), 0)
      : 0;

  const totalRevenue = await getInstructorRevenueByCourseIds(revenueCourseIds, token);

  return { totalCourses, totalStudents, averageRating, totalRevenue };
}

export async function getRecentEnrollments(
  token: string,
  courseIds: string[],
  limit: number = 10
): Promise<Enrollment[]> {
  if (courseIds.length === 0) return [];

  const requestedLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 10;
  const queryLimit = Math.min(Math.max(requestedLimit * 5, requestedLimit), 200);
  const chunks = chunkIds(courseIds);
  const headers = getAuthHeaders(token);

  const chunkResults = await Promise.all(
    chunks.map(async (chunk) => {
      const params = new URLSearchParams();
      params.set("filter[course_id][_in]", chunk.join(","));
      params.set("filter[status][_neq]", "cancelled");
      params.set(
        "fields",
        "id,enrolled_at,progress_percentage,status,last_lesson_id,completed_at,date_created,user_id,user_id.id,user_id.first_name,user_id.last_name,user_id.email,user_id.avatar,course_id,course_id.id,course_id.title,course_id.slug,course_id.total_lessons"
      );
      params.set("sort", "-enrolled_at,-date_created,-id");
      params.set("limit", String(queryLimit));

      const res = await fetch(`${directusUrl}/items/enrollments?${params.toString()}`, {
        headers,
        next: { revalidate: 0 },
      });

      if (!res.ok) return [] as Enrollment[];

      const payload = await res.json();
      return (payload?.data ?? []) as Enrollment[];
    })
  );

  const enrollments = chunkResults
    .flat()
    .sort((a, b) => {
      const aTime = Date.parse(String(a.enrolled_at ?? a.date_created ?? ""));
      const bTime = Date.parse(String(b.enrolled_at ?? b.date_created ?? ""));
      if (!Number.isFinite(aTime) || !Number.isFinite(bTime)) return 0;
      return bTime - aTime;
    });

  const deduped = dedupeEnrollmentsByUserCourse(enrollments).slice(0, requestedLimit);
  return enrichEnrollments(deduped, token);
}

export async function getCourseStudents(
  token: string,
  courseId: string
): Promise<CourseStudent[]> {
  const res = await fetch(
    `${directusUrl}/items/enrollments?filter[course_id][_eq]=${courseId}&fields=id,enrolled_at,progress_percentage,status,course_id.id,course_id.total_lessons,user_id.id,user_id.first_name,user_id.last_name,user_id.email,user_id.avatar,user_id.phone,user_id.headline,user_id.bio,user_id.social_links,user_id.status,user_id.date_created,user_id.role.id,user_id.role.name&sort=-enrolled_at`,
    {
      headers: getAuthHeaders(token),
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) return [];

  const data = await res.json();
  const enrollments: Enrollment[] = data.data ?? [];
  const hydrated = await enrichEnrollments(enrollments, token);
  const studentsMap = new Map<string, CourseStudent>();

  for (const enrollment of hydrated) {
    const user = enrollment.user_id;
    if (!user || typeof user !== "object" || !user.id) continue;

    const userId = String(user.id);
    const candidate: CourseStudent = {
      id: enrollment.id,
      user: user as DirectusUser,
      enrolled_at: enrollment.enrolled_at,
      progress_percentage: enrollment.progress_percentage,
      status: enrollment.status,
      last_accessed: null,
    };

    const existing = studentsMap.get(userId);
    if (!existing) {
      studentsMap.set(userId, candidate);
      continue;
    }

    const candidateProgress = Number(candidate.progress_percentage ?? 0);
    const existingProgress = Number(existing.progress_percentage ?? 0);
    if (candidateProgress > existingProgress) {
      studentsMap.set(userId, candidate);
      continue;
    }

    if (candidateProgress === existingProgress) {
      const candidateTime = Date.parse(candidate.enrolled_at);
      const existingTime = Date.parse(existing.enrolled_at);
      if (Number.isFinite(candidateTime) && candidateTime > existingTime) {
        studentsMap.set(userId, candidate);
      }
    }
  }

  return Array.from(studentsMap.values()).sort((a, b) => {
    const aTime = Date.parse(a.enrolled_at);
    const bTime = Date.parse(b.enrolled_at);
    if (!Number.isFinite(aTime) || !Number.isFinite(bTime)) return 0;
    return bTime - aTime;
  });
}

export async function getInstructorAtRiskStudents(
  token: string,
  courseIds: string[],
  limit: number = 12
): Promise<InstructorAtRiskStudent[]> {
  if (courseIds.length === 0) return [];

  const requestedLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 12;
  const queryLimit = Math.min(Math.max(requestedLimit * 8, 50), 240);
  const chunks = chunkIds(courseIds);
  const headers = getAuthHeaders(token);

  const chunkResults = await Promise.all(
    chunks.map(async (chunk) => {
      const params = new URLSearchParams();
      params.set("filter[course_id][_in]", chunk.join(","));
      params.set("filter[status][_neq]", "cancelled");
      params.set(
        "fields",
        "id,enrolled_at,progress_percentage,status,last_lesson_id,completed_at,date_created,user_id,user_id.id,user_id.first_name,user_id.last_name,user_id.email,user_id.avatar,course_id,course_id.id,course_id.title,course_id.slug,course_id.total_lessons"
      );
      params.set("sort", "-date_created,-enrolled_at");
      params.set("limit", String(queryLimit));

      const res = await fetch(`${directusUrl}/items/enrollments?${params.toString()}`, {
        headers,
        next: { revalidate: 0 },
      });

      if (!res.ok) return [] as Enrollment[];

      const payload = await res.json();
      return (payload?.data ?? []) as Enrollment[];
    })
  );

  const enrollments = await enrichEnrollments(
    dedupeEnrollmentsByUserCourse(chunkResults.flat()),
    token
  );
  const riskRows = await fetchInstructorRiskRows(courseIds, Math.min(queryLimit, 100));

  const merged = enrollments
    .map((enrollment) => {
      const user = enrollment.user_id as DirectusUser | null;
      const course = enrollment.course_id as Course | null;
      if (!user || typeof user !== "object" || !course || typeof course !== "object") {
        return null;
      }

      const key = `${user.id}:${course.id}`;
      const risk = riskRows.get(key);
      const fallback = fallbackRiskForEnrollment(enrollment);

      return {
        enrollment_id: enrollment.id,
        user,
        course,
        progress_percentage: Number(enrollment.progress_percentage ?? 0),
        risk_score: Number(risk?.risk_score ?? fallback.risk_score),
        risk_band: (risk?.risk_band ?? fallback.risk_band) as InstructorAtRiskStudent["risk_band"],
        inactive_days: Number(risk?.inactive_days ?? fallback.inactive_days),
        failed_quiz_attempts_7d: Number(
          risk?.failed_quiz_attempts_7d ?? fallback.failed_quiz_attempts_7d
        ),
        streak_days: Number(risk?.streak_days ?? fallback.streak_days),
        last_activity_at: risk?.last_activity_at ?? fallback.last_activity_at,
        recommended_action: risk?.recommended_action ?? fallback.recommended_action,
      } satisfies InstructorAtRiskStudent;
    })
    .filter((item): item is InstructorAtRiskStudent => item !== null)
    .sort((a, b) => {
      if (b.risk_score !== a.risk_score) return b.risk_score - a.risk_score;
      if (b.inactive_days !== a.inactive_days) return b.inactive_days - a.inactive_days;
      return a.progress_percentage - b.progress_percentage;
    });

  return merged.slice(0, requestedLimit);
}

export async function getInstructorMentorAnalytics(
  _token: string,
  courseIds: string[],
  lookbackDays: number = 30
): Promise<InstructorMentorAnalytics> {
  const fallback: InstructorMentorAnalytics = {
    lookback_days: lookbackDays,
    shown: 0,
    clicked: 0,
    dismissed: 0,
    completed: 0,
    ctr: 0,
    completion_rate: 0,
    clicked_completion_rate: 0,
    non_clicked_completion_rate: 0,
    completion_lift_pp: 0,
    completion_lift_ratio: 0,
    interventions_sent: 0,
    notification_interventions: 0,
    email_interventions: 0,
  };

  if (courseIds.length === 0) {
    return fallback;
  }

  return (await fetchMentorAnalyticsRows(courseIds, lookbackDays)) ?? fallback;
}

export async function getCourseReviews(
  token: string,
  courseId: string,
  sort: string = "-date_created"
): Promise<Review[]> {
  const res = await fetch(
    `${directusUrl}/items/reviews?filter[course_id][_eq]=${courseId}&fields=*,user_id.id,user_id.first_name,user_id.last_name,user_id.email,user_id.avatar&sort=${sort}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) return [];

  const data = await res.json();
  return data.data ?? [];
}

export async function getRatingDistribution(
  token: string,
  courseId: string
): Promise<Record<number, number>> {
  const res = await fetch(
    `${directusUrl}/items/reviews?filter[course_id][_eq]=${courseId}&groupBy[]=rating&aggregate[count]=id`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) return createEmptyRatingDistribution();

  const data = await res.json();
  const distribution = createEmptyRatingDistribution();
  for (const item of data.data ?? []) {
    const rating = normalizeRating(item?.rating);
    if (!rating) continue;
    distribution[rating] = Number(item?.count?.id ?? 0);
  }
  return distribution;
}

export async function getRatingDistributionForCourses(
  token: string,
  courseIds: string[],
  approvedOnly: boolean = true
): Promise<Record<number, number>> {
  if (courseIds.length === 0) return createEmptyRatingDistribution();

  const headers = getAuthHeaders(token);
  const chunks = chunkIds(courseIds);
  const chunkDistributions = await Promise.all(
    chunks.map(async (chunk) => {
      const params = new URLSearchParams();
      params.set("filter[course_id][_in]", chunk.join(","));
      if (approvedOnly) {
        params.set("filter[status][_eq]", "approved");
      }
      params.append("groupBy[]", "rating");
      params.append("aggregate[count]", "id");
      params.set("limit", "-1");

      const res = await fetch(`${directusUrl}/items/reviews?${params.toString()}`, {
        headers,
        next: { revalidate: 0 },
      });

      if (!res.ok) return createEmptyRatingDistribution();

      const data = await res.json();
      const distribution = createEmptyRatingDistribution();
      for (const item of data.data ?? []) {
        const rating = normalizeRating(item?.rating);
        if (!rating) continue;
        distribution[rating] = Number(item?.count?.id ?? 0);
      }

      return distribution;
    })
  );

  const totalDistribution = createEmptyRatingDistribution();
  for (const distribution of chunkDistributions) {
    for (const star of RATING_STARS) {
      totalDistribution[star] += distribution[star] ?? 0;
    }
  }

  return totalDistribution;
}

export interface InstructorRevenueDetails {
  totalRevenue: number;
  currentMonthRevenue: number;
  lastMonthRevenue: number;
  revenueChange: number;
  monthlyChart: { month: string; revenue: number }[];
  coursesRevenue: { id: string; title: string; slug: string; revenue: number; enrollments: number }[];
  totalOrders: number;
}

export async function getInstructorRevenueDetails(
  token: string
): Promise<InstructorRevenueDetails> {
  const courses = await getInstructorCourses(token);
  const courseIds = courses.map((c) => c.id);

  if (courseIds.length === 0) {
    return {
      totalRevenue: 0,
      currentMonthRevenue: 0,
      lastMonthRevenue: 0,
      revenueChange: 0,
      monthlyChart: [],
      coursesRevenue: [],
      totalOrders: 0,
    };
  }

  const headers = getAuthHeaders(token);
  const chunks = chunkIds(courseIds);

  // Fetch all order_items for instructor's courses with successful orders
  type OrderItemRow = { price: number; course_id: string; order_id: { paid_at: string | null; date_created: string } };
  const allItems: OrderItemRow[] = [];

  for (const chunk of chunks) {
    const params = new URLSearchParams();
    params.set("filter[course_id][_in]", chunk.join(","));
    params.set("filter[order_id][status][_eq]", "success");
    params.set("fields", "price,course_id,order_id.paid_at,order_id.date_created");
    params.set("limit", "-1");

    try {
      const res = await fetch(`${directusUrl}/items/order_items?${params.toString()}`, {
        headers,
        next: { revalidate: 0 },
      });
      if (!res.ok) continue;
      const data = await res.json();
      for (const item of data?.data ?? []) {
        allItems.push(item as OrderItemRow);
      }
    } catch {
      // best-effort
    }
  }

  // Calculate totals, monthly, and per-course revenue
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;

  let totalRevenue = 0;
  let currentMonthRevenue = 0;
  let lastMonthRevenue = 0;
  const monthlyRevenue: Record<string, number> = {};
  const courseRevenueMap: Record<string, number> = {};

  for (const item of allItems) {
    const amount = Number(item.price ?? 0);
    if (!Number.isFinite(amount)) continue;
    totalRevenue += amount;

    const courseId = typeof item.course_id === "object"
      ? String((item.course_id as { id?: string }).id ?? "")
      : String(item.course_id);
    courseRevenueMap[courseId] = (courseRevenueMap[courseId] ?? 0) + amount;

    const date = new Date(item.order_id?.paid_at || item.order_id?.date_created || now);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] ?? 0) + amount;

    if (monthKey === currentMonthKey) currentMonthRevenue += amount;
    if (monthKey === lastMonthKey) lastMonthRevenue += amount;
  }

  // Build last 6 months chart
  const monthNames = ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Th8", "Th9", "Th10", "Th11", "Th12"];
  const monthlyChart = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyChart.push({ month: monthNames[d.getMonth()], revenue: monthlyRevenue[key] ?? 0 });
  }

  const revenueChange = lastMonthRevenue > 0
    ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    : currentMonthRevenue > 0 ? 100 : 0;

  // Per-course revenue with course details
  const coursesRevenue = courses
    .map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      revenue: courseRevenueMap[c.id] ?? 0,
      enrollments: c.enrollment_count ?? 0,
    }))
    .filter((c) => c.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue);

  return {
    totalRevenue,
    currentMonthRevenue,
    lastMonthRevenue,
    revenueChange,
    monthlyChart,
    coursesRevenue,
    totalOrders: allItems.length,
  };
}

export async function verifyInstructorOwnership(
  token: string,
  courseId: number | string
): Promise<boolean> {
  const res = await fetch(
    `${directusUrl}/items/courses_instructors?filter[course_id][_eq]=${courseId}&filter[user_id][_eq]=$CURRENT_USER&limit=1`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) return false;

  const data = await res.json();
  return (data.data?.length ?? 0) > 0;
}
