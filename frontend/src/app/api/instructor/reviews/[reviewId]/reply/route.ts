import { NextRequest, NextResponse } from "next/server";
import { directusFetch, getCurrentUserId } from "@/lib/directus-fetch";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { reviewId } = await params;

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Không thể xác định người dùng." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const reply = typeof body?.reply === "string" ? body.reply.trim() : "";

    if (!reply) {
      return NextResponse.json(
        { error: "Nội dung phản hồi không được để trống." },
        { status: 400 }
      );
    }

    if (reply.length > 2000) {
      return NextResponse.json(
        { error: "Phản hồi không được dài quá 2000 ký tự." },
        { status: 400 }
      );
    }

    // Get the review to find its course_id
    const reviewRes = await directusFetch(
      `/items/reviews/${reviewId}?fields=id,course_id`
    );
    if (!reviewRes.ok) {
      return NextResponse.json(
        { error: "Không tìm thấy đánh giá." },
        { status: 404 }
      );
    }
    const reviewData = await reviewRes.json();
    const courseId = reviewData.data?.course_id;

    if (!courseId) {
      return NextResponse.json(
        { error: "Đánh giá không thuộc khoá học nào." },
        { status: 400 }
      );
    }

    // Verify instructor owns this course
    const ownerRes = await directusFetch(
      `/items/courses_instructors?filter[course_id][_eq]=${courseId}&filter[user_id][_eq]=${userId}&limit=1`
    );
    if (!ownerRes.ok) {
      return NextResponse.json(
        { error: "Lỗi xác minh quyền." },
        { status: 500 }
      );
    }
    const ownerData = await ownerRes.json();
    if ((ownerData.data?.length ?? 0) === 0) {
      return NextResponse.json(
        { error: "Bạn không có quyền phản hồi đánh giá này." },
        { status: 403 }
      );
    }

    // Update the review with instructor reply
    const updateRes = await directusFetch(`/items/reviews/${reviewId}`, {
      method: "PATCH",
      body: JSON.stringify({
        instructor_reply: reply,
        instructor_reply_at: new Date().toISOString(),
      }),
    });

    if (!updateRes.ok) {
      return NextResponse.json(
        { error: "Không thể lưu phản hồi." },
        { status: updateRes.status }
      );
    }

    const updated = await updateRes.json();
    return NextResponse.json({ data: updated.data });
  } catch {
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra." },
      { status: 500 }
    );
  }
}
