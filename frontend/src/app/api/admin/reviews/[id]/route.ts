import { NextRequest, NextResponse } from "next/server";
import { directusFetch } from "@/lib/directus-fetch";
import { recalculateCourseRating } from "@/lib/review-rating";
import { isValidReviewStatus } from "@/lib/validations";

async function getCourseIdByReviewId(reviewId: string): Promise<string | null> {
  try {
    const res = await directusFetch(
      `/items/reviews/${encodeURIComponent(reviewId)}?fields=course_id`
    );

    if (!res.ok) return null;

    const data = await res.json();
    const courseField = data.data?.course_id;
    return typeof courseField === "object"
      ? courseField?.id ?? null
      : courseField ?? null;
  } catch {
    return null;
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const courseId = await getCourseIdByReviewId(id);

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.status !== undefined) {
      if (!isValidReviewStatus(body.status)) {
        return NextResponse.json(
          { error: "Trạng thái không hợp lệ. Chỉ chấp nhận: pending, approved, rejected, hidden" },
          { status: 400 }
        );
      }
      updateData.status = body.status;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Không có dữ liệu cập nhật" },
        { status: 400 }
      );
    }

    const res = await directusFetch(`/items/reviews/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updateData),
    });

    if (res.status === 401) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 }
      );
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: "Không thể cập nhật đánh giá", details: error },
        { status: res.status }
      );
    }

    const data = await res.json();
    if (courseId) {
      await recalculateCourseRating(courseId);
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const courseId = await getCourseIdByReviewId(id);

    const res = await directusFetch(`/items/reviews/${id}`, {
      method: "DELETE",
    });

    if (res.status === 401) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 }
      );
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: "Không thể xoá đánh giá", details: error },
        { status: res.status }
      );
    }

    if (courseId) {
      await recalculateCourseRating(courseId);
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
