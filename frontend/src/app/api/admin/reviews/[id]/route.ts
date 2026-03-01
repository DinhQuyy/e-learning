import { NextRequest, NextResponse } from "next/server";
import { directusFetch } from "@/lib/directus-fetch";
import { recalculateCourseRating } from "@/lib/review-rating";

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
      updateData.status = body.status;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "KhÃ´ng cÃ³ dá»¯ liá»‡u cáº­p nháº­t" },
        { status: 400 }
      );
    }

    const res = await directusFetch(`/items/reviews/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updateData),
    });

    if (res.status === 401) {
      return NextResponse.json(
        { error: "KhÃ´ng cÃ³ quyá»n truy cáº­p" },
        { status: 401 }
      );
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: "KhÃ´ng thá»ƒ cáº­p nháº­t Ä‘Ã¡nh giÃ¡", details: error },
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
      { error: "Lá»—i há»‡ thá»‘ng" },
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
        { error: "KhÃ´ng cÃ³ quyá»n truy cáº­p" },
        { status: 401 }
      );
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: "KhÃ´ng thá»ƒ xoÃ¡ Ä‘Ã¡nh giÃ¡", details: error },
        { status: res.status }
      );
    }

    if (courseId) {
      await recalculateCourseRating(courseId);
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Lá»—i há»‡ thá»‘ng" },
      { status: 500 }
    );
  }
}
