import { NextRequest, NextResponse } from "next/server";
import { directusFetch, getCurrentUserId } from "@/lib/directus-fetch";
import { extractFileIdFromUrl } from "@/lib/directus";

const INSTRUCTOR_COURSE_LIST_FIELDS = [
  "id",
  "title",
  "slug",
  "thumbnail",
  "price",
  "discount_price",
  "status",
  "average_rating",
  "date_created",
  "category_id.id",
  "category_id.name",
].join(",");

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Không thể xác định người dùng." },
        { status: 401 }
      );
    }

    // Get course IDs from junction table
    const junctionRes = await directusFetch(
      `/items/courses_instructors?filter[user_id][_eq]=${userId}&fields=course_id&limit=-1`
    );

    if (junctionRes.status === 401) {
      return NextResponse.json({ error: "Chưa xác thực." }, { status: 401 });
    }

    if (!junctionRes.ok) {
      return NextResponse.json(
        { error: "Không thể tải danh sách khoá học." },
        { status: junctionRes.status }
      );
    }

    const junctionData = await junctionRes.json();
    const courseIds: string[] = Array.from(
      new Set(
        (junctionData.data ?? [])
          .map((j: { course_id?: string | { id?: string } | null }) =>
            typeof j.course_id === "string"
              ? j.course_id
              : typeof j.course_id?.id === "string"
                ? j.course_id.id
                : null
          )
          .filter((id: string | null): id is string => typeof id === "string" && id.length > 0)
      )
    );

    if (courseIds.length === 0) {
      return NextResponse.json({ data: [] });
    }
    // Fetch full course data in chunks to avoid long URL errors.
    const chunkSize = 60;
    const courseIdChunks: string[][] = [];
    for (let i = 0; i < courseIds.length; i += chunkSize) {
      courseIdChunks.push(courseIds.slice(i, i + chunkSize));
    }

    const courseResults = await Promise.all(
      courseIdChunks.map(async (chunk) => {
        const coursesRes = await directusFetch(
          `/items/courses?filter[id][_in]=${chunk.join(",")}&fields=${INSTRUCTOR_COURSE_LIST_FIELDS}&sort=-date_created&limit=-1`
        );

        if (!coursesRes.ok) return null;
        const payload = await coursesRes.json();
        return payload?.data ?? [];
      })
    );

    if (courseResults.some((result) => result === null)) {
      return NextResponse.json(
        { error: "Không thể tải khoá học." },
        { status: 500 }
      );
    }

    const courses = courseResults
      .flat()
      .sort((a: { date_created?: string }, b: { date_created?: string }) => {
        const aTime = Date.parse(String(a.date_created ?? ""));
        const bTime = Date.parse(String(b.date_created ?? ""));
        if (!Number.isFinite(aTime) || !Number.isFinite(bTime)) return 0;
        return bTime - aTime;
      });

    return NextResponse.json({ data: courses });
  } catch (error) {
    console.error("GET /api/instructor/courses error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Không thể xác định người dùng." },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Create course with draft status
    const coursePayload = {
      title: body.title,
      slug: body.slug,
      description: body.description || null,
      content: body.content || null,
      category_id: body.category_id || null,
      level: body.level || "all_levels",
      language: body.language || "Tiếng Việt",
      price: body.price ?? 0,
      discount_price: body.discount_price || null,
      requirements: body.requirements || null,
      what_you_learn: body.what_you_learn || null,
      target_audience: body.target_audience || null,
      promo_video_url: extractFileIdFromUrl(body.promo_video_url) || null,
      thumbnail: extractFileIdFromUrl(body.thumbnail) || null,
      status: "draft",
    };

    const courseRes = await directusFetch("/items/courses", {
      method: "POST",
      body: JSON.stringify(coursePayload),
    });

    if (courseRes.status === 401) {
      return NextResponse.json({ error: "Chưa xác thực." }, { status: 401 });
    }

    if (!courseRes.ok) {
      const errorData = await courseRes.json().catch(() => null);
      const message =
        errorData?.errors?.[0]?.message || "Không thể tạo khoá học.";
      return NextResponse.json(
        { error: message },
        { status: courseRes.status }
      );
    }

    const courseData = await courseRes.json();
    const course = courseData.data;

    // Create junction record linking instructor to course
    const junctionRes = await directusFetch("/items/courses_instructors", {
      method: "POST",
      body: JSON.stringify({
        course_id: course.id,
        user_id: userId,
      }),
    });

    if (!junctionRes.ok) {
      // Clean up created course if junction fails
      await directusFetch(`/items/courses/${course.id}`, {
        method: "DELETE",
      });
      return NextResponse.json(
        { error: "Không thể liên kết giảng viên với khoá học." },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: course }, { status: 201 });
  } catch (error) {
    console.error("POST /api/instructor/courses error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống." },
      { status: 500 }
    );
  }
}

