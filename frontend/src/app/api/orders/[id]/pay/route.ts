import { NextRequest, NextResponse } from "next/server";
import { directusFetch, getCurrentUserId } from "@/lib/directus-fetch";
import { recalculateCourseEnrollments } from "@/lib/enrollment-counter";
import { createOrGetEnrollment } from "@/lib/enrollment-integrity";
import { ORDER_PAYMENT_FIELDS } from "@/lib/directus-fields";

type OrderItemRow = {
  course_id?: string | { id?: string | null } | null;
};

async function syncOrderEnrollments(
  userId: string,
  items: OrderItemRow[] | undefined
): Promise<void> {
  if (!items || items.length === 0) return;

  const touchedCourseIds = new Set<string>();

  for (const item of items) {
    const courseId =
      typeof item.course_id === "object" ? item.course_id?.id : item.course_id;
    if (!courseId) continue;

    const normalizedCourseId = String(courseId);
    touchedCourseIds.add(normalizedCourseId);

    try {
      await createOrGetEnrollment({
        userId,
        courseId: normalizedCourseId,
      });
    } catch {
      // Demo payment flow: do not block checkout success on enrollment sync failures.
      // Access is self-healed later from successful orders when the learner opens the course.
    }
  }

  for (const courseId of touchedCourseIds) {
    await recalculateCourseEnrollments(courseId);
  }
}

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
      `/items/orders/${id}?fields=${ORDER_PAYMENT_FIELDS}`
    );

    if (orderRes.status === 401) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    if (!orderRes.ok) {
      return NextResponse.json(
        { error: "Không tìm thấy đơn hàng" },
        { status: 404 }
      );
    }

    const orderData = await orderRes.json();
    const order = orderData.data as { status?: string; items?: OrderItemRow[] };

    if (order.status === "success" && success) {
      await syncOrderEnrollments(currentUserId, order.items);
      return NextResponse.json({ data: order });
    }

    if (order.status !== "pending") {
      return NextResponse.json(
        { error: "Đơn hàng đã được xử lý" },
        { status: 400 }
      );
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

    if (success) {
      await syncOrderEnrollments(currentUserId, order.items);
    }

    return NextResponse.json({ data: { ...order, status: newStatus } });
  } catch {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
