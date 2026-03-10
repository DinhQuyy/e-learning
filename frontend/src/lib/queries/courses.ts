import { readItems, aggregate } from "@directus/sdk";
import { directus, directusUrl } from "../directus";
import type { Course } from "@/types";

const serverToken = process.env.DIRECTUS_STATIC_TOKEN;

type RatingMap = Record<string, { avg: number; count: number }>;
type EnrollmentMap = Record<string, number>;

async function fetchRatingsByCourse(courseIds: string[]): Promise<RatingMap> {
  const result: RatingMap = {};
  if (!serverToken || courseIds.length === 0) return result;

  try {
    const params = new URLSearchParams();
    params.set("filter[status][_eq]", "approved");
    params.set("filter[course_id][_in]", courseIds.join(","));
    params.append("groupBy[]", "course_id");
    params.append("aggregate[count]", "id");
    params.append("aggregate[avg]", "rating");

    const res = await fetch(
      `${directusUrl}/items/reviews?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${serverToken}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!res.ok) return result;

    const data = await res.json();
    for (const item of data.data ?? []) {
      const courseId =
        item.course_id?.id ??
        item["course_id"] ??
        item["course_id.id"] ??
        item["course_id._eq"];

      if (!courseId) continue;

      result[String(courseId)] = {
        avg: parseFloat(item?.avg?.rating ?? "0") || 0,
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
  if (!serverToken || courseIds.length === 0) return result;

  try {
    const params = new URLSearchParams();
    params.set("filter[course_id][_in]", courseIds.join(","));
    params.append("groupBy[]", "course_id");
    params.append("aggregate[countDistinct]", "user_id");

    const res = await fetch(
      `${directusUrl}/items/enrollments?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${serverToken}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!res.ok) return result;

    const data = await res.json();
    for (const item of data.data ?? []) {
      const courseId =
        item.course_id?.id ??
        item["course_id"] ??
        item["course_id.id"] ??
        item["course_id._eq"];

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
    filter.category_id = {
      slug: { _eq: category },
    };
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
      directus.request(
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
                { user_id: ["id", "first_name", "last_name", "email", "avatar"] },
              ],
            },
          ],
        })
      ),
      directus.request(
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
    const results = await directus.request(
      readItems("courses", {
        filter: {
          slug: { _eq: slug },
          status: { _eq: "published" },
        },
        limit: 1,
        fields: [
          "*",
          { category_id: ["id", "name", "slug"] },
          {
            instructors: [
              "id",
              {
                user_id: [
                  "id",
                  "first_name",
                  "last_name",
                  "email",
                  "avatar",
                  "bio",
                  "headline",
                  "social_links",
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
              "status",
              {
                user_id: ["id", "first_name", "last_name", "email", "avatar"],
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
  const data = await directus.request(
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
            { user_id: ["id", "first_name", "last_name", "email", "avatar"] },
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
  limit = 12
): Promise<GetCoursesResult> {
  return getCourses({ page, limit, category: categorySlug });
}

export async function getLatestCourses(limit = 8): Promise<Course[]> {
  try {
    const data = await directus.request(
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
              { user_id: ["id", "first_name", "last_name", "email", "avatar"] },
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
    const data = await directus.request(
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
              { user_id: ["id", "first_name", "last_name", "email", "avatar"] },
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

  const data = await directus.request(
    readItems("courses", {
      filter,
      sort: ["-average_rating", "-total_enrollments"],
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
            { user_id: ["id", "first_name", "last_name", "email", "avatar"] },
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
