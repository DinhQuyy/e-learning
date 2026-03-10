import { NextRequest, NextResponse } from "next/server";
import { directusFetch, getCurrentUserId } from "@/lib/directus-fetch";
import { enqueueLessonIndex } from "@/lib/ai-indexing";

async function verifyOwnership(
  userId: string,
  courseId: string
): Promise<boolean> {
  const res = await directusFetch(
    `/items/courses_instructors?filter[course_id][_eq]=${courseId}&filter[user_id][_eq]=${userId}&limit=1`
  );
  if (!res.ok) return false;
  const data = await res.json();
  return (data.data?.length ?? 0) > 0;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Không thể xác định người dùng." },
        { status: 401 }
      );
    }

    const isOwner = await verifyOwnership(userId, courseId);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Không có quyền truy cập." },
        { status: 403 }
      );
    }

    const res = await directusFetch(
      `/items/lessons?filter[module_id][course_id][_eq]=${courseId}&fields=id,title,slug,type,duration,is_free,sort,status,module_id,quizzes.id,quizzes.title,quizzes.description,quizzes.passing_score,quizzes.time_limit,quizzes.max_attempts,quizzes.questions.id&sort=module_id,sort`
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Không thể tải danh sách bài học." },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ data: data.data ?? [] });
  } catch (error) {
    console.error("GET lessons error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Không thể xác định người dùng." },
        { status: 401 }
      );
    }

    const isOwner = await verifyOwnership(userId, courseId);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Không có quyền truy cập." },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Get max sort value within the module
    const sortRes = await directusFetch(
      `/items/lessons?filter[module_id][_eq]=${body.module_id}&aggregate[max]=sort`
    );

    let maxSort = 0;
    if (sortRes.ok) {
      const sortData = await sortRes.json();
      maxSort = sortData.data?.[0]?.max?.sort ?? 0;
    }

    const lessonPayload = {
      title: body.title,
      slug: body.slug,
      content: body.content || null,
      video_url: body.video_url || null,
      duration: body.duration ?? 0,
      module_id: body.module_id,
      sort: maxSort + 1,
      is_free: body.is_free ?? false,
      type: body.type || "video",
      status: body.status || "draft",
    };

    const res = await directusFetch("/items/lessons", {
      method: "POST",
      body: JSON.stringify(lessonPayload),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      const message =
        errorData?.errors?.[0]?.message || "Không thể tạo bài học.";
      return NextResponse.json({ error: message }, { status: res.status });
    }

    const data = await res.json();
    await enqueueLessonIndex({
      lessonId: String(data.data.id),
      title: String(data.data.title ?? lessonPayload.title ?? "Lesson"),
      content: String(data.data.content ?? lessonPayload.content ?? lessonPayload.title ?? ""),
      courseId,
      status: String(data.data.status ?? lessonPayload.status ?? "draft"),
    });

    return NextResponse.json({ data: data.data }, { status: 201 });
  } catch (error) {
    console.error("POST lessons error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
  }
}
