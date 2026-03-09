import { directusUrl } from "@/lib/directus";

interface AdminStatsResult {
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  pendingCourses: number;
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

export async function getUsers(token: string, params: GetUsersParams = {}) {
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
    throw new Error("Không thể tải danh sách người dùng");
  }

  return res.json();
}

export async function getUserById(token: string, id: string) {
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

export async function getAllCourses(
  token: string,
  params: GetCoursesParams = {}
) {
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

  const url = `${directusUrl}/items/courses?fields=id,title,slug,thumbnail,status,is_featured,total_enrollments,average_rating,date_created,category_id.id,category_id.name,instructors.user_id.id,instructors.user_id.first_name,instructors.user_id.last_name&sort=-date_created&limit=${limit}&offset=${offset}&meta=filter_count,total_count${filterStr}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error("Không thể tải danh sách khoá học");
  }

  return res.json();
}

export async function getReviewsForModeration(
  token: string,
  status: string = "pending"
) {
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

export async function getReportData(token: string) {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // Popular courses by enrollment
  const popularCoursesRes = await fetch(
    `${directusUrl}/items/courses?fields=id,title,slug,total_enrollments,average_rating,instructors.user_id.first_name,instructors.user_id.last_name&sort=-total_enrollments&limit=10&filter[status][_eq]=published`,
    { headers, next: { revalidate: 0 } }
  );

  const popularCourses = popularCoursesRes.ok
    ? (await popularCoursesRes.json()).data ?? []
    : [];

  // Recent enrollments for trends (get last 200 to compute monthly)
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

  // Top instructors - get all courses with instructors
  const instructorCoursesRes = await fetch(
    `${directusUrl}/items/courses?fields=id,total_enrollments,average_rating,instructors.user_id.id,instructors.user_id.first_name,instructors.user_id.last_name,instructors.user_id.avatar&filter[status][_eq]=published&limit=500`,
    { headers, next: { revalidate: 0 } }
  );

  const instructorCourses = instructorCoursesRes.ok
    ? (await instructorCoursesRes.json()).data ?? []
    : [];

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

  for (const course of instructorCourses) {
    const instructors = course.instructors ?? [];
    const uniqueInstructorIds = new Set<string>();
    const totalEnrollments = Number(course.total_enrollments ?? 0);
    const normalizedEnrollments = Number.isFinite(totalEnrollments)
      ? totalEnrollments
      : 0;
    const averageRating = Number(course.average_rating ?? 0);
    const normalizedRating = Number.isFinite(averageRating) ? averageRating : 0;

    for (const inst of instructors) {
      const user = inst.user_id;
      if (!user || typeof user === "string") continue;
      if (uniqueInstructorIds.has(user.id)) continue;
      uniqueInstructorIds.add(user.id);
      const existing = instructorMap.get(user.id);
      if (existing) {
        existing.coursesCount += 1;
        existing.totalStudents += normalizedEnrollments;
        existing.totalRating += normalizedRating;
      } else {
        instructorMap.set(user.id, {
          id: user.id,
          name: [user.first_name, user.last_name].filter(Boolean).join(" ") || "N/A",
          avatar: user.avatar ?? null,
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

  return {
    popularCourses,
    enrollments,
    ratingDistribution: ratingDistRes,
    topInstructors,
  };
}

export async function getRevenueStats(token: string) {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // Get all successful orders from last 12 months
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const ordersRes = await fetch(
    `${directusUrl}/items/orders?fields=id,total_amount,paid_at,date_created&filter[status][_eq]=success&filter[paid_at][_gte]=${twelveMonthsAgo.toISOString()}&sort=-paid_at&limit=1000`,
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

export async function getEnrollmentTrend(token: string) {
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

export async function getCourseStatusDistribution(token: string) {
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

export async function getLatestEnrollments(token: string, limit: number = 5) {
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

export async function getLatestReviews(token: string, limit: number = 5) {
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
