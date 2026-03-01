import { NextRequest, NextResponse } from "next/server";
import { directusFetch, getCurrentUserId } from "@/lib/directus-fetch";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get current user ID
    const currentUserId = await getCurrentUserId();

    const { success } = await request.json();

    // Get order with items
    const orderRes = await directusFetch(
      `/items/orders/${id}?fields=*,items.course_id.id,items.course_id.slug`
    );

    if (orderRes.status === 401) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    if (!orderRes.ok) return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 });
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

    // Update order status
    await directusFetch(`/items/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updatePayload),
    });

    // If success, create enrollments for all courses
    if (success && order.items) {
      for (const item of order.items) {
        const courseId = typeof item.course_id === "object" ? item.course_id.id : item.course_id;
        if (!courseId) continue;

        // Check not already enrolled
        const checkRes = await directusFetch(
          `/items/enrollments?filter[course_id][_eq]=${courseId}&limit=1`
        );
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData.data?.length > 0) continue;
        }

        await directusFetch("/items/enrollments", {
          method: "POST",
          body: JSON.stringify({
            user_id: currentUserId,
            course_id: courseId,
            status: "active",
            progress_percentage: 0,
            enrolled_at: new Date().toISOString(),
          }),
        }).catch(() => {});
      }
    }

    return NextResponse.json({ data: { ...order, status: newStatus } });
  } catch {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
