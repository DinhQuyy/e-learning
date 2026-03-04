import { NextRequest, NextResponse } from "next/server";
import { directusFetch, getCurrentUserId } from "@/lib/directus-fetch";
import { recalculateCourseEnrollments } from "@/lib/enrollment-counter";
import { createOrGetEnrollment } from "@/lib/enrollment-integrity";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { success } = await request.json();

    const orderRes = await directusFetch(
      `/items/orders/${id}?fields=*,items.course_id.id,items.course_id.slug`
    );

    if (orderRes.status === 401) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    if (!orderRes.ok) {
      return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 });
    }

    const orderData = await orderRes.json();
    const order = orderData.data;

    if (order.status !== "pending") {
      return NextResponse.json({ error: "Đơn hàng đã được xử lý" }, { status: 400 });
    }

    const newStatus = success ? "success" : "failed";
    const updatePayload: Record<string, unknown> = { status: newStatus };

    if (success) {
      updatePayload.paid_at = new Date().toISOString();
      updatePayload.payment_ref = `PAY-${Date.now()}`;
    }

    await directusFetch(`/items/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updatePayload),
    });

    if (success && order.items) {
      const touchedCourseIds = new Set<string>();

      for (const item of order.items) {
        const courseId =
          typeof item.course_id === "object" ? item.course_id.id : item.course_id;
        if (!courseId) continue;

        const normalizedCourseId = String(courseId);
        touchedCourseIds.add(normalizedCourseId);

        await createOrGetEnrollment({
          userId: currentUserId,
          courseId: normalizedCourseId,
        }).catch(() => {});
      }

      for (const courseId of touchedCourseIds) {
        await recalculateCourseEnrollments(courseId);
      }
    }

    return NextResponse.json({ data: { ...order, status: newStatus } });
  } catch {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
