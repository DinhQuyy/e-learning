import { NextRequest, NextResponse } from "next/server";
import { directusFetch, getCurrentUserId } from "@/lib/directus-fetch";
import { recalculateCourseRating } from "@/lib/review-rating";

function normalizeId(field: unknown): string | null {
  if (!field) return null;
  if (typeof field === "string") return field;
  if (typeof field === "object" && "id" in (field as Record<string, unknown>)) {
    const value = (field as { id?: string }).id;
    return typeof value === "string" ? value : null;
  }
  return null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { rating, comment } = body as {
      rating?: number;
      comment?: string | null;
    };

    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: "Đánh giá phải từ 1 đến 5 sao" },
        { status: 400 }
      );
    }

    if (rating === undefined && comment === undefined) {
      return NextResponse.json(
        { error: "Không có dữ liệu cập nhật" },
        { status: 400 }
      );
    }

    // Ensure the review belongs to current user
    const reviewRes = await directusFetch(
      `/items/reviews/${encodeURIComponent(id)}?fields=id,user_id,course_id`
    );

    if (!reviewRes.ok) {
      return NextResponse.json(
        { error: "Không tìm thấy đánh giá" },
        { status: reviewRes.status === 404 ? 404 : 400 }
      );
    }

    const reviewData = await reviewRes.json();
    const ownerId = normalizeId(reviewData.data?.user_id);
    const courseId = normalizeId(reviewData.data?.course_id);

    if (!ownerId || ownerId !== userId) {
      return NextResponse.json(
        { error: "Bạn không có quyền sửa đánh giá này" },
        { status: 403 }
      );
    }

    const updatePayload: Record<string, unknown> = {};
    if (rating !== undefined) updatePayload.rating = rating;
    if (comment !== undefined) updatePayload.comment = comment ?? null;

    const updateRes = await directusFetch(
      `/items/reviews/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(updatePayload),
      }
    );

    if (!updateRes.ok) {
      const errData = await updateRes.json().catch(() => ({}));
      return NextResponse.json(
        {
          error:
            errData?.errors?.[0]?.message || "Không thể cập nhật đánh giá",
        },
        { status: updateRes.status }
      );
    }

    const updated = await updateRes.json();

    if (courseId) {
      await recalculateCourseRating(courseId);
    }

    return NextResponse.json({ data: updated.data ?? updated });
  } catch {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
