import { readItems, aggregate } from "@directus/sdk";
import { publicDirectus, directus} from "../directus";
import type { Course } from "@/types";

type RatingMap = Record<string, { avg: number; count: number }>;
type EnrollmentMap = Record<string, number>;

async function fetchRatingsByCourse(courseIds: string[]): Promise<RatingMap> {
  const result: RatingMap = {};
  if (courseIds.length === 0) return result;

  try {
    const url = process.env.NEXT_PUBLIC_DIRECTUS_URL ?? "http://localhost:8055";
    const params = new URLSearchParams();
    params.set("filter[status][_eq]", "approved");
    params.set("filter[course_id][_in]", courseIds.join(","));
    params.append("groupBy[]", "course_id");
    params.append("aggregate[count]", "id");
    params.append("aggregate[avg]", "rating");
    params.append("limit", "-1");

    const res = await fetch(`${url}/items/reviews?${params.toString()}`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!res.ok) return result;

    const data = await res.json();
    for (const item of data.data ?? []) {
      const courseId =
        (item.course_id as { id?: string } | null)?.id ??
        (typeof item.course_id === "string" ? item.course_id : null);

      if (!courseId) continue;

      result[String(courseId)] = {
        avg: parseFloat(String(item?.avg?.rating ?? "0")) || 0,
        count: Number(item?.count?.id ?? 0),
      };
    }
  } catch {
    // best effort; fall back to stored values
  }

  return result;
}

async function fetchEnrollmentCountsByCourse(
  courseIds: string[]
): Promise<EnrollmentMap> {
  const result: EnrollmentMap = {};
  if (courseIds.length === 0) return result;

  try {
    const url = process.env.NEXT_PUBLIC_DIRECTUS_URL ?? "http://localhost:8055";
    const params = new URLSearchParams();
    params.set("filter[course_id][_in]", courseIds.join(","));
    params.append("groupBy[]", "course_id");
    params.append("aggregate[countDistinct]", "user_id");
    params.append("limit", "-1");

    const res = await fetch(`${url}/items/enrollments?${params.toString()}`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!res.ok) return result;

    const data = await res.json();
    for (const item of data.data ?? []) {
      const courseId =
        (item.course_id as { id?: string } | null)?.id ??
        (typeof item.course_id === "string" ? item.course_id : null);

      if (!courseId) continue;
      result[String(courseId)] = Number(
        item?.countDistinct?.user_id ??
          item?.countdistinct?.user_id ??
          item?.count?.id ??
          0
      );
    }
  } catch {
    // best effort
  }

  return result;
}

function mergeMetricsIntoCourses<T extends Course>(
  courses: T[],
  ratingMap: RatingMap,
  enrollmentMap: EnrollmentMap
): T[] {
  return courses.map((course) => {
    const ratingData = ratingMap[course.id];
    const averageRating = ratingData?.avg ?? Number(course.average_rating ?? 0);
    const reviewCount =
      ratingData?.count ??
      (typeof (course as unknown as { review_count?: number }).review_count ===
      "number"
        ? (course as unknown as { review_count?: number }).review_count
        : 0);

    const enrollmentCount =
      enrollmentMap[course.id] ??
      (typeof (course as unknown as { enrollment_count?: number })
        .enrollment_count === "number"
        ? Number((course as unknown as { enrollment_count?: number }).enrollment_count ?? 0)
        : 0);

    return {
      ...course,
      average_rating: averageRating,
      review_count: reviewCount,
      enrollment_count: enrollmentCount,
      total_enrollments: enrollmentCount,
    };
  });
}

type CategoryTreeNode = {
  id: string;
  slug: string;
  parent_id: string | number | { id?: string | number | null } | null;
};

function getCategoryParentId(
  parent: CategoryTreeNode["parent_id"]
): string | null {
  if (!parent) return null;
  if (typeof parent === "string") return parent;
  if (typeof parent === "number") return String(parent);

  const parentId = parent.id;
  if (typeof parentId === "string") return parentId;
  if (typeof parentId === "number") return String(parentId);
  return null;
}

async function resolveCategoryTreeIds(
  categoryValue: string
): Promise<string[] | null> {
  const normalizedValue = categoryValue.trim();
  if (!normalizedValue) return null;

  try {
    const categories = (await publicDirectus.request(
      readItems("categories", {
        filter: {
          status: { _eq: "published" },
        },
        limit: -1,
        fields: ["id", "slug", "parent_id"],
      })
    )) as unknown as CategoryTreeNode[];

    const selectedCategory = categories.find(
      (item) => item.slug === normalizedValue || item.id === normalizedValue
    );
    if (!selectedCategory) return null;

    const childrenByParent = new Map<string, string[]>();
    for (const category of categories) {
      const parentId = getCategoryParentId(category.parent_id);
      if (!parentId) continue;

      const existing = childrenByParent.get(parentId) ?? [];
      existing.push(category.id);
      childrenByParent.set(parentId, existing);
    }

    const ids: string[] = [];
    const queue: string[] = [selectedCategory.id];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId || visited.has(currentId)) continue;

      visited.add(currentId);
      ids.push(currentId);

      const children = childrenByParent.get(currentId) ?? [];
      for (const childId of children) {
        if (!visited.has(childId)) {
          queue.push(childId);
        }
      }
    }

    return ids;
  } catch {
    return null;
  }
}

interface GetCoursesParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  level?: string;
  price?: string;
  rating?: number;
  sort?: string;
}

interface GetCoursesResult {
  data: Course[];
  total: number;
}

function getSortField(sort: string): string[] {
  switch (sort) {
    case "newest":
      return ["-date_created"];
    case "oldest":
      return ["date_created"];
    case "popular":
      return ["-total_enrollments"];
    case "rating":
      return ["-average_rating"];
    case "price_asc":
      return ["price"];
    case "price_desc":
      return ["-price"];
    default:
      return ["-date_created"];
  }
}

export async function getCourses({
  page = 1,
  limit = 12,
  search,
  category,
  level,
  price,
  rating,
  sort = "newest",
}: GetCoursesParams = {}): Promise<GetCoursesResult> {
  const filter: Record<string, unknown> = {
    status: { _eq: "published" },
  };

  if (search) {
    filter._or = [
      { title: { _contains: search } },
      { description: { _contains: search } },
    ];
  }

  if (category) {
    const categoryIds = await resolveCategoryTreeIds(category);
    if (categoryIds && categoryIds.length > 0) {
      filter.category_id =
        categoryIds.length === 1
          ? { _eq: categoryIds[0] }
          : { _in: categoryIds };
    } else {
      filter.id = { _eq: "__invalid_category__" };
    }
  }

  if (level && level !== "all") {
    filter.level = { _eq: level };
  }

  if (price === "free") {
    filter.price = { _eq: 0 };
  } else if (price === "paid") {
    filter.price = { _gt: 0 };
  }

  if (typeof rating === "number" && !Number.isNaN(rating) && rating > 0) {
    filter.average_rating = { _gte: rating };
  }

  try {
    const [data, countResult] = await Promise.all([
      publicDirectus.request(
        readItems("courses", {
          filter,
          sort: getSortField(sort) as never,
          limit,
          offset: (page - 1) * limit,
          fields: [
            "id",
            "title",
            "slug",
            "description",
            "thumbnail",
            "price",
            "discount_price",
            "level",
            "average_rating",
            "total_enrollments",
            "total_lessons",
            "total_duration",
            "is_featured",
            "date_created",
            { category_id: ["id", "name", "slug"] },
            {
              instructors: [
                "id",
                { user_id: ["id", "first_name", "last_name", "avatar"] },
              ],
            },
          ],
        })
      ),
      publicDirectus.request(
        aggregate("courses", {
          aggregate: { count: "*" },
          query: { filter },
        })
      ),
    ]);

    const courses = data as unknown as Course[];
    const courseIds = courses.map((course) => course.id);
    const [ratingMap, enrollmentMap] = await Promise.all([
      fetchRatingsByCourse(courseIds),
      fetchEnrollmentCountsByCourse(courseIds),
    ]);
    const enrichedCourses = mergeMetricsIntoCourses(
      courses,
      ratingMap,
      enrollmentMap
    );
    const total = Number(countResult?.[0]?.count ?? 0);

    return { data: enrichedCourses, total };
  } catch {
    return { data: [], total: 0 };
  }
}

export async function getCourseBySlug(slug: string): Promise<Course | null> {
  try {
    const results = await publicDirectus.request(
      readItems("courses", {
        filter: {
          slug: { _eq: slug },
          status: { _eq: "published" },
        },
        limit: 1,
        fields: [
          "id",
          "title",
          "slug",
          "description",
          "short_description",
          "content",
          "thumbnail",
          "price",
          "discount_price",
          "level",
          "average_rating",
          "total_enrollments",
          "total_lessons",
          "total_duration",
          "language",
          "promo_video_url",
          "date_created",
          "date_updated",
          "what_you_learn",
          "requirements",
          "target_audience",
          { category_id: ["id", "name", "slug"] },
          {
            instructors: [
              "id",
              {
                user_id: [
                  "id",
                  "first_name",
                  "last_name",
                  "avatar",
                  "bio",
                  "headline",
                ],
              },
            ],
          },
          {
            modules: [
              "id",
              "title",
              "description",
              "sort",
              {
                lessons: [
                  "id",
                  "title",
                  "slug",
                  "duration",
                  "is_free",
                  "type",
                  "sort",
                  "status",
                ],
              },
            ],
          },
          {
            reviews: [
              "id",
              "rating",
              "comment",
              "date_created",
              {
                user_id: ["id", "first_name", "last_name", "avatar"],
              },
            ],
          },
        ],
      })
    );

    if (!results || results.length === 0) return null;
    const course = results[0] as unknown as Course;

    const courseId = course.id;
    const [ratingMap, enrollmentMap] = await Promise.all([
      fetchRatingsByCourse([courseId]),
      fetchEnrollmentCountsByCourse([courseId]),
    ]);

    const [enriched] = mergeMetricsIntoCourses(
      [course],
      ratingMap,
      enrollmentMap
    );

    return enriched;
  } catch {
    return null;
  }
}

export async function getFeaturedCourses(limit = 8): Promise<Course[]> {
  const data = await publicDirectus.request(
    readItems("courses", {
      filter: {
        status: { _eq: "published" },
        is_featured: { _eq: true },
      },
      sort: ["-date_created"],
      limit,
      fields: [
        "id",
        "title",
        "slug",
        "description",
        "thumbnail",
        "price",
        "discount_price",
        "level",
        "average_rating",
        "total_enrollments",
        "total_lessons",
        "total_duration",
        "is_featured",
        "date_created",
        { category_id: ["id", "name", "slug"] },
        {
          instructors: [
            "id",
            { user_id: ["id", "first_name", "last_name", "avatar"] },
          ],
        },
      ],
    })
  );

  const courses = data as unknown as Course[];
  const courseIds = courses.map((c) => c.id);
  const [ratingMap, enrollmentMap] = await Promise.all([
    fetchRatingsByCourse(courseIds),
    fetchEnrollmentCountsByCourse(courseIds),
  ]);
  return mergeMetricsIntoCourses(courses, ratingMap, enrollmentMap);
}

export async function getCoursesByCategory(
  categorySlug: string,
  page = 1,
  limit = 12,
  options?: { sort?: string; level?: string }
): Promise<GetCoursesResult> {
  return getCourses({
    page,
    limit,
    category: categorySlug,
    sort: options?.sort,
    level: options?.level,
  });
}

export async function getCoursesByInstructor(
  instructorId: string,
  excludeCourseId?: string,
  limit = 4
): Promise<Course[]> {
  try {
    // Find courses linked to this instructor via junction table
    const junctionRes = await directus.request(
      readItems("courses_instructors" as never, {
        filter: { directus_users_id: { _eq: instructorId } } as never,
        fields: ["courses_id"] as never[],
        limit: -1,
      } as never)
    );

    const courseIds = (junctionRes as Array<{ courses_id?: string | null }>)
      .map((j) => j.courses_id)
      .filter((id): id is string => typeof id === "string" && id !== excludeCourseId);

    if (courseIds.length === 0) return [];

    const courses = await publicDirectus.request(
      readItems("courses", {
        filter: {
          id: { _in: courseIds },
          status: { _eq: "published" },
        } as never,
        fields: LISTING_FIELDS as never[],
        limit,
        sort: ["-total_enrollments"] as never[],
      })
    );

    return enrichCourses(courses as unknown as Course[]);
  } catch {
    return [];
  }
}

export async function getLatestCourses(limit = 8): Promise<Course[]> {
  try {
    const data = await publicDirectus.request(
      readItems("courses", {
        filter: { status: { _eq: "published" } },
        sort: ["-date_created"],
        limit,
        fields: [
          "id",
          "title",
          "slug",
          "description",
          "thumbnail",
          "price",
          "discount_price",
          "level",
          "average_rating",
          "total_enrollments",
          "total_lessons",
          "total_duration",
          "date_created",
          { category_id: ["id", "name", "slug"] },
          {
            instructors: [
              "id",
              { user_id: ["id", "first_name", "last_name", "avatar"] },
            ],
          },
        ],
      })
    );
    const courses = data as unknown as Course[];
    const courseIds = courses.map((c) => c.id);
    const [ratingMap, enrollmentMap] = await Promise.all([
      fetchRatingsByCourse(courseIds),
      fetchEnrollmentCountsByCourse(courseIds),
    ]);
    return mergeMetricsIntoCourses(courses, ratingMap, enrollmentMap);
  } catch {
    return [];
  }
}

export async function getPopularCourses(limit = 8): Promise<Course[]> {
  try {
    const data = await publicDirectus.request(
      readItems("courses", {
        filter: { status: { _eq: "published" } },
        sort: ["-total_enrollments"],
        limit,
        fields: [
          "id",
          "title",
          "slug",
          "description",
          "thumbnail",
          "price",
          "discount_price",
          "level",
          "average_rating",
          "total_enrollments",
          "total_lessons",
          "total_duration",
          "date_created",
          { category_id: ["id", "name", "slug"] },
          {
            instructors: [
              "id",
              { user_id: ["id", "first_name", "last_name", "avatar"] },
            ],
          },
        ],
      })
    );
    const courses = data as unknown as Course[];
    const courseIds = courses.map((c) => c.id);
    const [ratingMap, enrollmentMap] = await Promise.all([
      fetchRatingsByCourse(courseIds),
      fetchEnrollmentCountsByCourse(courseIds),
    ]);
    return mergeMetricsIntoCourses(courses, ratingMap, enrollmentMap);
  } catch {
    return [];
  }
}

export async function getTopReviews(limit = 6) {
  try {
    const data = await directus.request(
      readItems("reviews", {
        filter: {
          status: { _eq: "approved" },
          rating: { _gte: 4 },
          comment: { _nnull: true },
        },
        sort: ["-rating", "-date_created"],
        limit,
        fields: [
          "id",
          "rating",
          "comment",
          "date_created",
          {
            user_id: ["id", "first_name", "last_name", "email", "avatar"],
          },
          {
            course_id: ["id", "title", "slug"],
          },
        ],
      })
    );
    return data as unknown as Array<{
      id: string;
      rating: number;
      comment: string;
      date_created: string;
      user_id: { id: string; first_name: string | null; last_name: string | null; email: string; avatar: string | null };
      course_id: { id: string; title: string; slug: string };
    }>;
  } catch {
    return [];
  }
}

// ── Shared listing fields ──

const LISTING_FIELDS = [
  "id",
  "title",
  "slug",
  "description",
  "thumbnail",
  "price",
  "discount_price",
  "level",
  "average_rating",
  "total_enrollments",
  "total_lessons",
  "total_duration",
  "date_created",
  { category_id: ["id", "name", "slug"] },
  {
    instructors: [
      "id",
      { user_id: ["id", "first_name", "last_name", "avatar"] },
    ],
  },
] as never[];

async function enrichCourses(courses: Course[]): Promise<Course[]> {
  if (courses.length === 0) return [];
  const ids = courses.map((c) => c.id);
  const [ratingMap, enrollmentMap] = await Promise.all([
    fetchRatingsByCourse(ids),
    fetchEnrollmentCountsByCourse(ids),
  ]);
  return mergeMetricsIntoCourses(courses, ratingMap, enrollmentMap);
}

export async function getRelatedCourses(
  courseId: string,
  categoryId: string | null,
  limit = 4
): Promise<Course[]> {
  const filter: Record<string, unknown> = {
    status: { _eq: "published" },
    id: { _neq: courseId },
  };

  if (categoryId) {
    filter.category_id = { _eq: categoryId };
  }

  try {
    const data = await publicDirectus.request(
      readItems("courses", {
        filter,
        sort: ["-average_rating", "-total_enrollments"],
        limit,
        fields: LISTING_FIELDS,
      })
    );
    return enrichCourses(data as unknown as Course[]);
  } catch {
    return [];
  }
}

// ── Course Recommendations ──

/**
 * Courses from categories the student has studied, excluding already-enrolled.
 */
export async function getRecommendedByCategories(
  enrolledCourseIds: string[],
  enrolledCategoryIds: string[],
  limit = 8
): Promise<Course[]> {
  if (enrolledCategoryIds.length === 0) return [];

  try {
    const filter: Record<string, unknown> = {
      status: { _eq: "published" },
      category_id: { _in: enrolledCategoryIds },
    };
    if (enrolledCourseIds.length > 0) {
      filter.id = { _nin: enrolledCourseIds };
    }

    const data = await directus.request(
      readItems("courses", {
        filter,
        sort: ["-average_rating", "-total_enrollments"],
        limit,
        fields: LISTING_FIELDS,
      })
    );
    return enrichCourses(data as unknown as Course[]);
  } catch {
    return [];
  }
}

/**
 * Courses from instructors the student has studied with, excluding already-enrolled.
 */
export async function getRecommendedByInstructors(
  enrolledCourseIds: string[],
  enrolledInstructorIds: string[],
  limit = 8
): Promise<Course[]> {
  if (enrolledInstructorIds.length === 0) return [];

  try {
    const serverToken = process.env.DIRECTUS_STATIC_TOKEN;
    const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL ?? "http://localhost:8055";
    const params = new URLSearchParams();
    params.set("filter[user_id][_in]", enrolledInstructorIds.join(","));
    params.set("fields", "course_id");
    params.set("limit", "-1");

    const junctionHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (serverToken) junctionHeaders["Authorization"] = `Bearer ${serverToken}`;

    const junctionRes = await fetch(
      `${directusUrl}/items/courses_instructors?${params.toString()}`,
      {
        headers: junctionHeaders,
        cache: "no-store",
      }
    );
    if (!junctionRes.ok) return [];

    const junctionData = await junctionRes.json();
    const allInstructorCourseIds: string[] = Array.from(
      new Set<string>(
        (junctionData.data ?? [])
          .map((j: { course_id?: string | null }) => j.course_id)
          .filter((id: unknown): id is string => typeof id === "string")
      )
    );
    const instructorCourseIds = allInstructorCourseIds.filter(
      (id) => !enrolledCourseIds.includes(id)
    );

    if (instructorCourseIds.length === 0) return [];

    const data = await directus.request(
      readItems("courses", {
        filter: {
          status: { _eq: "published" },
          id: { _in: instructorCourseIds.slice(0, 60) },
        },
        sort: ["-average_rating", "-total_enrollments"],
        limit,
        fields: LISTING_FIELDS,
      })
    );
    return enrichCourses(data as unknown as Course[]);
  } catch {
    return [];
  }
}

/**
 * Trending courses (highest enrollment), excluding already-enrolled.
 */
export async function getTrendingCourses(
  enrolledCourseIds: string[] = [],
  limit = 8
): Promise<Course[]> {
  try {
    const filter: Record<string, unknown> = {
      status: { _eq: "published" },
    };
    if (enrolledCourseIds.length > 0) {
      filter.id = { _nin: enrolledCourseIds };
    }

    const data = await directus.request(
      readItems("courses", {
        filter,
        sort: ["-total_enrollments", "-average_rating"],
        limit,
        fields: LISTING_FIELDS,
      })
    );
    return enrichCourses(data as unknown as Course[]);
  } catch {
    return [];
  }
}

export interface PlatformStats {
  totalCourses: number;
  totalStudents: number;
  totalInstructors: number;
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const serverToken = process.env.DIRECTUS_STATIC_TOKEN;
  const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL ?? "http://localhost:8055";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (serverToken) headers.Authorization = `Bearer ${serverToken}`;

  const [coursesRes, studentsRes, instructorsRes] = await Promise.allSettled([
    fetch(`${directusUrl}/items/courses?filter[status][_eq]=published&aggregate[count]=id`, {
      headers,
      cache: "no-store",
    }),
    fetch(`${directusUrl}/items/enrollments?aggregate[countDistinct]=user_id`, {
      headers,
      cache: "no-store",
    }),
    fetch(`${directusUrl}/items/courses_instructors?aggregate[countDistinct]=user_id`, {
      headers,
      cache: "no-store",
    }),
  ]);

  const extract = async (result: PromiseSettledResult<Response>): Promise<number> => {
    if (result.status !== "fulfilled" || !result.value.ok) return 0;
    try {
      const data = await result.value.json();
      const row = data?.data?.[0];
      if (!row) return 0;
      const val = row?.count?.id ?? row?.countDistinct?.user_id ?? 0;
      return Number(val) || 0;
    } catch {
      return 0;
    }
  };

  return {
    totalCourses: await extract(coursesRes),
    totalStudents: await extract(studentsRes),
    totalInstructors: await extract(instructorsRes),
  };
}
