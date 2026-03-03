import { directusFetch } from "@/lib/directus-fetch";
import { recalculateCourseEnrollments } from "@/lib/enrollment-counter";
import { createOrGetEnrollment } from "@/lib/enrollment-integrity";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.status !== undefined) {
      updateData.status = body.status;
      if (body.status === "success") {
        updateData.paid_at = new Date().toISOString();
      }
    }

    const res = await directusFetch(`/items/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updateData),
    });

    if (res.status === 401) {
      return NextResponse.json(
        { error: "Khong co quyen truy cap" },
        { status: 401 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: "Khong the cap nhat don hang" },
        { status: res.status }
      );
    }

    if (body.status === "success") {
      try {
        const orderRes = await directusFetch(
          `/items/orders/${id}?fields=user_id,items.course_id`
        );

        if (orderRes.ok) {
          const orderData = await orderRes.json();
          const order = orderData.data;
          const userId =
            typeof order.user_id === "string" ? order.user_id : order.user_id?.id;
          const touchedCourseIds = new Set<string>();

          for (const item of order.items ?? []) {
            const courseId =
              typeof item.course_id === "string" ? item.course_id : item.course_id?.id;

            if (userId && courseId) {
              const normalizedCourseId = String(courseId);
              touchedCourseIds.add(normalizedCourseId);

              await createOrGetEnrollment({
                userId: String(userId),
                courseId: normalizedCourseId,
              }).catch(() => {});
            }
          }

          for (const courseId of touchedCourseIds) {
            await recalculateCourseEnrollments(courseId);
          }
        }
      } catch {
        // Non-critical
      }
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Loi he thong" }, { status: 500 });
  }
}
