import { directusUrl } from "@/lib/directus";
import { callAiApiRaw } from "@/lib/ai-client";

// ── Shared types ──

interface DirectusListResponse<T> {
  data: T[];
  meta?: { filter_count?: number; total_count?: number };
}

interface AdminRole {
  id: string;
  name: string;
}

interface AdminUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  avatar: string | null;
  status: string;
  date_created: string;
  role: AdminRole | null;
}

interface AdminUserDetail extends AdminUser {
  bio?: string | null;
  phone?: string | null;
  headline?: string | null;
  social_links?: Record<string, string> | null;
}

interface AdminReview {
  id: number;
  rating: number;
  comment: string | null;
  status: string;
  date_created: string;
  user_id:
    | {
        id: string;
        first_name: string | null;
        last_name: string | null;
        avatar: string | null;
        email: string;
      }
    | null;
  course_id:
    | {
        id: number;
        title: string;
        slug: string;
      }
    | null;
}

interface ReportDataResult {
  popularCourses: Array<{
    id: number;
    title: string;
    slug?: string;
    total_enrollments: number;
    average_rating: number;
  }>;
  enrollments: Array<{ enrolled_at: string }>;
  ratingDistribution: Array<{ rating: number; count: number }>;
  topInstructors: Array<{
    id: string;
    name: string;
    avatar: string | null;
    coursesCount: number;
    totalStudents: number;
    avgRating: number;
  }>;
  aiMetrics: AiMetricsResult;
  aiDailyMetrics: AiDailyMetricsResult;
}

interface RevenueStatsResult {
  totalRevenue: number;
  currentMonthRevenue: number;
  lastMonthRevenue: number;
  revenueChange: number;
  monthlyChart: Array<{ month: string; revenue: number }>;
  totalOrders: number;
}

interface EnrollmentTrendItem {
  month: string;
  enrollments: number;
}

interface CourseStatusItem {
  name: string;
  value: number;
  fill: string;
}

interface LatestEnrollment {
  id: number;
  enrolled_at: string;
  status?: string;
  user_id: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar: string | null;
  };
  course_id: {
    id: number;
    title: string;
  };
}

interface LatestReview {
  id: number;
  rating: number;
  comment: string | null;
  date_created: string;
  user_id: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar: string | null;
  };
  course_id: {
    id: number;
    title: string;
  };
}

interface AdminStatsResult {
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  pendingCourses: number;
}

interface AiMetricsResult {
  total_requests_24h: number;
  p95_latency_ms: number;
  blocked_requests_24h: number;
  cache_hit_ratio: number;
  fallback_rate_24h: number;
  positive_feedback_24h: number;
  negative_feedback_24h: number;
}

interface AiDailyMetricRow {
  metric_date: string;
  total_requests: number;
  p95_latency_ms: number;
  blocked_requests: number;
  cache_hit_ratio: number;
  fallback_rate: number;
  positive_feedback: number;
  negative_feedback: number;
}

interface AiDailyMetricsSummary {
  window_days: number;
  req_change_pct: number;
  p95_improvement_pct: number;
  fallback_improvement_pct: number;
  positive_feedback_change_pct: number;
}

interface AiDailyMetricsResult {
  rows: AiDailyMetricRow[];
  summary: AiDailyMetricsSummary;
}

const EMPTY_AI_METRICS: AiMetricsResult = {
  total_requests_24h: 0,
  p95_latency_ms: 0,
  blocked_requests_24h: 0,
  cache_hit_ratio: 0,
  fallback_rate_24h: 0,
  positive_feedback_24h: 0,
  negative_feedback_24h: 0,
};

function toFiniteNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toPositiveInt(value: unknown): number {
  const parsed = Math.trunc(toFiniteNumber(value));
  return parsed > 0 ? parsed : 0;
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function normalizeAiMetrics(raw: unknown): AiMetricsResult {
  const data = readObject(raw);
  return {
    total_requests_24h: toPositiveInt(data.total_requests_24h),
    p95_latency_ms: toPositiveInt(data.p95_latency_ms),
    blocked_requests_24h: toPositiveInt(data.blocked_requests_24h),
    cache_hit_ratio: toFiniteNumber(data.cache_hit_ratio),
    fallback_rate_24h: toFiniteNumber(data.fallback_rate_24h),
    positive_feedback_24h: toPositiveInt(data.positive_feedback_24h),
    negative_feedback_24h: toPositiveInt(data.negative_feedback_24h),
  };
}

function createEmptyAiDailyMetrics(days: number): AiDailyMetricsResult {
  const safeDays = Math.max(days, 2);
  return {
    rows: [],
    summary: {
      window_days: Math.max(Math.floor(safeDays / 2), 1),
      req_change_pct: 0,
      p95_improvement_pct: 0,
      fallback_improvement_pct: 0,
      positive_feedback_change_pct: 0,
    },
  };
}

function normalizeAiDailyMetrics(raw: unknown, days: number): AiDailyMetricsResult {
  const data = readObject(raw);
  const rows = Array.isArray(data.rows)
    ? data.rows.map((row) => {
        const r = readObject(row);
        return {
          metric_date:
            typeof r.metric_date === "string" ? r.metric_date : "",
          total_requests: toPositiveInt(r.total_requests),
          p95_latency_ms: toPositiveInt(r.p95_latency_ms),
          blocked_requests: toPositiveInt(r.blocked_requests),
          cache_hit_ratio: toFiniteNumber(r.cache_hit_ratio),
          fallback_rate: toFiniteNumber(r.fallback_rate),
          positive_feedback: toPositiveInt(r.positive_feedback),
          negative_feedback: toPositiveInt(r.negative_feedback),
        };
      })
    : [];

  const fallback = createEmptyAiDailyMetrics(days);
  const summaryData = readObject(data.summary);

  return {
    rows,
    summary: {
      window_days:
        toPositiveInt(summaryData.window_days) || fallback.summary.window_days,
      req_change_pct: toFiniteNumber(summaryData.req_change_pct),
      p95_improvement_pct: toFiniteNumber(summaryData.p95_improvement_pct),
      fallback_improvement_pct: toFiniteNumber(summaryData.fallback_improvement_pct),
      positive_feedback_change_pct: toFiniteNumber(
        summaryData.positive_feedback_change_pct
      ),
    },
  };
}

async function getAiMetrics(): Promise<AiMetricsResult> {
  try {
    const raw = await callAiApiRaw("/v1/admin/metrics");
    return normalizeAiMetrics(raw);
  } catch {
    return EMPTY_AI_METRICS;
  }
}

async function getAiDailyMetrics(days: number = 14): Promise<AiDailyMetricsResult> {
  const safeDays = Math.max(days, 2);
  try {
    const raw = await callAiApiRaw(
      `/v1/admin/metrics/daily?days=${encodeURIComponent(String(safeDays))}`
    );
    return normalizeAiDailyMetrics(raw, safeDays);
  } catch {
    return createEmptyAiDailyMetrics(safeDays);
  }
}

export async function getAdminStats(token: string): Promise<AdminStatsResult> {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const [usersRes, coursesRes, enrollmentsRes, pendingRes] = await Promise.all([
    fetch(`${directusUrl}/users?aggregate[count]=id&filter[status][_neq]=suspended`, {
      headers,
      next: { revalidate: 0 },
    }),
    fetch(`${directusUrl}/items/courses?aggregate[count]=id`, {
      headers,
      next: { revalidate: 0 },
    }),
    fetch(`${directusUrl}/items/enrollments?aggregate[count]=id`, {
      headers,
      next: { revalidate: 0 },
    }),
    fetch(
      `${directusUrl}/items/courses?aggregate[count]=id&filter[status][_eq]=review`,
      {
        headers,
        next: { revalidate: 0 },
      }
    ),
  ]);

  const [usersData, coursesData, enrollmentsData, pendingData] =
    await Promise.all([
      usersRes.ok ? usersRes.json() : { data: [{ count: { id: 0 } }] },
      coursesRes.ok ? coursesRes.json() : { data: [{ count: { id: 0 } }] },
      enrollmentsRes.ok
        ? enrollmentsRes.json()
        : { data: [{ count: { id: 0 } }] },
      pendingRes.ok ? pendingRes.json() : { data: [{ count: { id: 0 } }] },
    ]);

  return {
    totalUsers: Number(usersData.data?.[0]?.count?.id ?? 0),
    totalCourses: Number(coursesData.data?.[0]?.count?.id ?? 0),
    totalEnrollments: Number(enrollmentsData.data?.[0]?.count?.id ?? 0),
    pendingCourses: Number(pendingData.data?.[0]?.count?.id ?? 0),
  };
}

interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
}

export async function getUsers(token: string, params: GetUsersParams = {}): Promise<DirectusListResponse<AdminUser>> {
  const { page = 1, limit = 20, search, role, status } = params;
  const offset = (page - 1) * limit;

  const filterParts: string[] = [];

  if (search) {
    filterParts.push(
      `filter[_or][0][first_name][_icontains]=${encodeURIComponent(search)}` +
        `&filter[_or][1][last_name][_icontains]=${encodeURIComponent(search)}` +
        `&filter[_or][2][email][_icontains]=${encodeURIComponent(search)}`
    );
  }

  if (role && role !== "all") {
    filterParts.push(`filter[role][name][_eq]=${encodeURIComponent(role)}`);
  }

  if (status && status !== "all") {
    filterParts.push(`filter[status][_eq]=${encodeURIComponent(status)}`);
  }

  const filterStr = filterParts.length > 0 ? `&${filterParts.join("&")}` : "";

  const url = `${directusUrl}/users?fields=id,first_name,last_name,email,avatar,status,date_created,role.id,role.name&sort=-date_created&limit=${limit}&offset=${offset}&meta=filter_count,total_count${filterStr}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error("KhÃ´ng thá»ƒ táº£i danh sÃ¡ch ngÆ°á»i dÃ¹ng");
  }

  return res.json();
}

export async function getUserById(token: string, id: string): Promise<AdminUserDetail | null> {
  const url = `${directusUrl}/users/${id}?fields=id,first_name,last_name,email,avatar,status,date_created,bio,phone,headline,social_links,role.id,role.name`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  return data.data;
}

interface GetCoursesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

interface AdminCourseListRow {
  id: string;
  total_enrollments?: number | null;
  [key: string]: unknown;
}

interface EnrollmentAggregateRow {
  course_id?: string | { id?: string | null } | null;
  countDistinct?: { user_id?: number | string | null } | null;
  countdistinct?: { user_id?: number | string | null } | null;
  count?: { id?: number | string | null } | null;
}

interface ReportInstructorUserRow {
  id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar?: string | null;
}

interface ReportCourseInstructorRow {
  user_id?: string | ReportInstructorUserRow | null;
}

interface ReportCourseRow {
  id: string;
  title?: string | null;
  slug?: string | null;
  average_rating?: number | null;
  instructors?: ReportCourseInstructorRow[] | null;
}

function extractCourseIdFromAggregate(row: EnrollmentAggregateRow): string | null {
  const raw = row.course_id;
  if (typeof raw === "string" && raw.trim().length > 0) return raw;
  if (raw && typeof raw === "object" && typeof raw.id === "string" && raw.id.trim().length > 0) {
    return raw.id;
  }
  return null;
}

function getEnrollmentCountFromAggregate(row: EnrollmentAggregateRow): number {
  const rawCount =
    row.countDistinct?.user_id ??
    row.countdistinct?.user_id ??
    row.count?.id ??
    0;
  const parsed = Number(rawCount);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isReportCourseRow(value: unknown): value is ReportCourseRow {
  const row = readObject(value);
  return typeof row.id === "string" && row.id.trim().length > 0;
}

async function getEnrollmentCountMapByCourseIds(
  headers: Record<string, string>,
  courseIds: string[]
): Promise<Map<string, number>> {
  const enrollmentCountByCourseId = new Map<string, number>();
  if (courseIds.length === 0) return enrollmentCountByCourseId;

  const batchSize = 120;
  for (let i = 0; i < courseIds.length; i += batchSize) {
    const batchIds = courseIds.slice(i, i + batchSize);
    const enrollmentParams = new URLSearchParams();
    enrollmentParams.set("filter[course_id][_in]", batchIds.join(","));
    enrollmentParams.set("filter[status][_neq]", "cancelled");
    enrollmentParams.append("groupBy[]", "course_id");
    enrollmentParams.append("aggregate[countDistinct]", "user_id");
    enrollmentParams.set("limit", "-1");

    const enrollmentRes = await fetch(
      `${directusUrl}/items/enrollments?${enrollmentParams.toString()}`,
      {
        headers,
        next: { revalidate: 0 },
      }
    );

    if (!enrollmentRes.ok) {
      continue;
    }

    const enrollmentPayload = await enrollmentRes.json();
    const rows = Array.isArray(enrollmentPayload?.data)
      ? (enrollmentPayload.data as EnrollmentAggregateRow[])
      : [];

    for (const row of rows) {
      const courseId = extractCourseIdFromAggregate(row);
      if (!courseId) continue;
      enrollmentCountByCourseId.set(courseId, getEnrollmentCountFromAggregate(row));
    }
  }

  return enrollmentCountByCourseId;
}

export async function getAllCourses(
  token: string,
  params: GetCoursesParams = {}
)  {
  const { page = 1, limit = 20, search, status } = params;
  const offset = (page - 1) * limit;

  const filterParts: string[] = [];

  if (search) {
    filterParts.push(
      `filter[title][_icontains]=${encodeURIComponent(search)}`
    );
  }

  if (status && status !== "all") {
    filterParts.push(`filter[status][_eq]=${encodeURIComponent(status)}`);
  }

  const filterStr = filterParts.length > 0 ? `&${filterParts.join("&")}` : "";
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const url = `${directusUrl}/items/courses?fields=id,title,slug,thumbnail,status,is_featured,total_enrollments,average_rating,date_created,category_id.id,category_id.name,instructors.user_id.id,instructors.user_id.first_name,instructors.user_id.last_name&sort=-date_created&limit=${limit}&offset=${offset}&meta=filter_count,total_count${filterStr}`;

  const res = await fetch(url, {
    headers,
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error("Không thể tải danh sách khoá học");
  }

  const payload = await res.json();
  const courses = Array.isArray(payload?.data)
    ? (payload.data as AdminCourseListRow[])
    : [];

  if (courses.length === 0) {
    return payload;
  }

  const courseIds = courses
    .map((course) => course.id)
    .filter((id): id is string => typeof id === "string" && id.trim().length > 0);

  if (courseIds.length === 0) {
    return payload;
  }

  try {
    const enrollmentParams = new URLSearchParams();
    enrollmentParams.set("filter[course_id][_in]", courseIds.join(","));
    enrollmentParams.append("groupBy[]", "course_id");
    enrollmentParams.append("aggregate[countDistinct]", "user_id");

    const enrollmentRes = await fetch(
      `${directusUrl}/items/enrollments?${enrollmentParams.toString()}`,
      {
        headers,
        next: { revalidate: 0 },
      }
    );

    if (!enrollmentRes.ok) {
      return payload;
    }

    const enrollmentPayload = await enrollmentRes.json();
    const rows = Array.isArray(enrollmentPayload?.data)
      ? (enrollmentPayload.data as EnrollmentAggregateRow[])
      : [];

    const enrollmentCountByCourseId = new Map<string, number>();
    for (const row of rows) {
      const courseId = extractCourseIdFromAggregate(row);
      if (!courseId) continue;
      enrollmentCountByCourseId.set(courseId, getEnrollmentCountFromAggregate(row));
    }

    payload.data = courses.map((course) => ({
      ...course,
      total_enrollments: enrollmentCountByCourseId.get(course.id) ?? 0,
    }));
  } catch {
    // Keep fallback values from courses collection if aggregation fails.
  }

  return payload;
}

export async function getReviewsForModeration(
  token: string,
  status: string = "pending"
): Promise<AdminReview[]> {
  const filterStr =
    status === "all" ? "" : `&filter[status][_eq]=${encodeURIComponent(status)}`;

  const url = `${directusUrl}/items/reviews?fields=id,rating,comment,status,date_created,user_id.id,user_id.first_name,user_id.last_name,user_id.avatar,user_id.email,course_id.id,course_id.title,course_id.slug&sort=-date_created&limit=50${filterStr}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  return data.data ?? [];
}

export async function getReportData(token: string): Promise<ReportDataResult> {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // Pull published courses first, then compute "real" enrollment counts from enrollments table.
  const publishedCoursesRes = await fetch(
    `${directusUrl}/items/courses?fields=id,title,slug,average_rating,instructors.user_id.id,instructors.user_id.first_name,instructors.user_id.last_name,instructors.user_id.avatar&filter[status][_eq]=published&limit=-1`,
    { headers, next: { revalidate: 0 } }
  );

  const publishedCoursesRaw = publishedCoursesRes.ok
    ? (await publishedCoursesRes.json()).data ?? []
    : [];
  const publishedCourses = Array.isArray(publishedCoursesRaw)
    ? publishedCoursesRaw.filter(isReportCourseRow)
    : [];

  const publishedCourseIds = publishedCourses.map((course) => course.id);
  const enrollmentCountByCourseId = await getEnrollmentCountMapByCourseIds(
    headers,
    publishedCourseIds
  );

  const popularCourses = publishedCourses
    .map((course) => {
      const numericId = Number(course.id);
      const averageRating = Number(course.average_rating ?? 0);
      return {
        id: Number.isFinite(numericId) ? numericId : 0,
        title: typeof course.title === "string" ? course.title : "N/A",
        slug: typeof course.slug === "string" ? course.slug : "",
        total_enrollments: enrollmentCountByCourseId.get(course.id) ?? 0,
        average_rating: Number.isFinite(averageRating) ? averageRating : 0,
      };
    })
    .filter((course) => course.id > 0)
    .sort((a, b) => b.total_enrollments - a.total_enrollments)
    .slice(0, 10);

  // Recent enrollments for trends.
  const enrollmentsRes = await fetch(
    `${directusUrl}/items/enrollments?fields=id,enrolled_at&sort=-enrolled_at&limit=500`,
    { headers, next: { revalidate: 0 } }
  );

  const enrollments = enrollmentsRes.ok
    ? (await enrollmentsRes.json()).data ?? []
    : [];

  // Rating distribution
  const ratingDistRes = await Promise.all(
    [1, 2, 3, 4, 5].map((rating) =>
      fetch(
        `${directusUrl}/items/reviews?aggregate[count]=id&filter[rating][_eq]=${rating}&filter[status][_eq]=approved`,
        { headers, next: { revalidate: 0 } }
      ).then(async (r) => {
        if (!r.ok) return { rating, count: 0 };
        const d = await r.json();
        return { rating, count: Number(d.data?.[0]?.count?.id ?? 0) };
      })
    )
  );

  // Aggregate instructor data
  const instructorMap = new Map<
    string,
    {
      id: string;
      name: string;
      avatar: string | null;
      coursesCount: number;
      totalStudents: number;
      totalRating: number;
    }
  >();

  for (const course of publishedCourses) {
    const instructors = Array.isArray(course.instructors) ? course.instructors : [];
    const uniqueInstructorIds = new Set<string>();
    const normalizedEnrollments = enrollmentCountByCourseId.get(course.id) ?? 0;
    const averageRating = Number(course.average_rating ?? 0);
    const normalizedRating = Number.isFinite(averageRating) ? averageRating : 0;

    for (const inst of instructors) {
      const user = inst?.user_id;
      if (!user || typeof user === "string") continue;
      if (typeof user.id !== "string" || user.id.trim().length === 0) continue;
      if (uniqueInstructorIds.has(user.id)) continue;
      uniqueInstructorIds.add(user.id);
      const existing = instructorMap.get(user.id);

      const nameParts = [user.first_name, user.last_name].filter(
        (part): part is string => typeof part === "string" && part.trim().length > 0
      );
      const displayName = nameParts.join(" ") || "N/A";
      const avatar = typeof user.avatar === "string" ? user.avatar : null;

      if (existing) {
        existing.coursesCount += 1;
        existing.totalStudents += normalizedEnrollments;
        existing.totalRating += normalizedRating;
      } else {
        instructorMap.set(user.id, {
          id: user.id,
          name: displayName,
          avatar,
          coursesCount: 1,
          totalStudents: normalizedEnrollments,
          totalRating: normalizedRating,
        });
      }
    }
  }

  const topInstructors = Array.from(instructorMap.values())
    .map((i) => ({
      ...i,
      avgRating: i.coursesCount > 0 ? i.totalRating / i.coursesCount : 0,
    }))
    .sort((a, b) => b.totalStudents - a.totalStudents)
    .slice(0, 10);

  const [aiMetrics, aiDailyMetrics] = await Promise.all([
    getAiMetrics(),
    getAiDailyMetrics(14),
  ]);

  return {
    popularCourses,
    enrollments,
    ratingDistribution: ratingDistRes,
    topInstructors,
    aiMetrics,
    aiDailyMetrics,
  };
}

export async function getRevenueStats(token: string, from?: string, to?: string): Promise<RevenueStatsResult> {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // Get all successful orders from last 12 months (or custom date range)
  const dateFilters: string[] = [`filter[status][_eq]=success`];
  if (from) {
    dateFilters.push(`filter[date_created][_gte]=${encodeURIComponent(from)}T00:00:00`);
  } else {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    dateFilters.push(`filter[paid_at][_gte]=${twelveMonthsAgo.toISOString()}`);
  }
  if (to) {
    dateFilters.push(`filter[date_created][_lte]=${encodeURIComponent(to)}T23:59:59`);
  }

  const ordersRes = await fetch(
    `${directusUrl}/items/orders?fields=id,total_amount,paid_at,date_created&${dateFilters.join("&")}&sort=-paid_at&limit=1000`,
    { headers, next: { revalidate: 0 } }
  );

  const orders = ordersRes.ok ? (await ordersRes.json()).data ?? [] : [];

  // Calculate monthly revenue
  const monthlyRevenue: Record<string, number> = {};
  let totalRevenue = 0;
  let currentMonthRevenue = 0;
  let lastMonthRevenue = 0;

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;

  for (const order of orders) {
    const amount = Number(order.total_amount ?? 0);
    if (!Number.isFinite(amount)) continue;
    totalRevenue += amount;

    const date = new Date(order.paid_at || order.date_created);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] ?? 0) + amount;

    if (monthKey === currentMonthKey) currentMonthRevenue += amount;
    if (monthKey === lastMonthKey) lastMonthRevenue += amount;
  }

  // Build last 6 months array for chart
  const monthlyChart = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthNames = ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Th8", "Th9", "Th10", "Th11", "Th12"];
    monthlyChart.push({
      month: monthNames[d.getMonth()],
      revenue: monthlyRevenue[key] ?? 0,
    });
  }

  const revenueChange = lastMonthRevenue > 0
    ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    : currentMonthRevenue > 0 ? 100 : 0;

  return {
    totalRevenue,
    currentMonthRevenue,
    lastMonthRevenue,
    revenueChange,
    monthlyChart,
    totalOrders: orders.length,
  };
}

export async function getEnrollmentTrend(token: string): Promise<EnrollmentTrendItem[]> {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const res = await fetch(
    `${directusUrl}/items/enrollments?fields=id,enrolled_at&filter[enrolled_at][_gte]=${sixMonthsAgo.toISOString()}&sort=-enrolled_at&limit=1000`,
    { headers, next: { revalidate: 0 } }
  );

  const enrollments = res.ok ? (await res.json()).data ?? [] : [];

  const now = new Date();
  const monthlyCount: Record<string, number> = {};

  for (const e of enrollments) {
    const date = new Date(e.enrolled_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlyCount[key] = (monthlyCount[key] ?? 0) + 1;
  }

  const monthNames = ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Th8", "Th9", "Th10", "Th11", "Th12"];
  const trend = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    trend.push({
      month: monthNames[d.getMonth()],
      enrollments: monthlyCount[key] ?? 0,
    });
  }

  return trend;
}

export async function getCourseStatusDistribution(token: string): Promise<CourseStatusItem[]> {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const statuses = ["draft", "review", "published", "archived"];
  const results = await Promise.all(
    statuses.map(async (status) => {
      const res = await fetch(
        `${directusUrl}/items/courses?aggregate[count]=id&filter[status][_eq]=${status}`,
        { headers, next: { revalidate: 0 } }
      );
      if (!res.ok) return { status, count: 0 };
      const data = await res.json();
      return { status, count: Number(data.data?.[0]?.count?.id ?? 0) };
    })
  );

  const labelMap: Record<string, string> = {
    draft: "Bản nháp",
    review: "Chờ duyệt",
    published: "Đã xuất bản",
    archived: "Lưu trữ",
  };

  const colorMap: Record<string, string> = {
    draft: "#94a3b8",
    review: "#f59e0b",
    published: "#22c55e",
    archived: "#6b7280",
  };

  return results.map((r) => ({
    name: labelMap[r.status] ?? r.status,
    value: r.count,
    fill: colorMap[r.status] ?? "#8884d8",
  }));
}

export async function getLatestEnrollments(token: string, limit: number = 5): Promise<LatestEnrollment[]> {
  const url = `${directusUrl}/items/enrollments?fields=id,enrolled_at,status,user_id.id,user_id.first_name,user_id.last_name,user_id.avatar,course_id.id,course_id.title&sort=-enrolled_at&limit=${limit}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data.data ?? [];
}

export async function getLatestReviews(token: string, limit: number = 5): Promise<LatestReview[]> {
  const url = `${directusUrl}/items/reviews?fields=id,rating,comment,date_created,user_id.id,user_id.first_name,user_id.last_name,user_id.avatar,course_id.id,course_id.title&sort=-date_created&limit=${limit}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data.data ?? [];
}

