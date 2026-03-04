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
        { error: "Không có quyền truy cập" },
        { status: 401 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: "Không thể cập nhật đơn hàng" },
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
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const orderRes = await directusFetch(`/items/orders/${id}?fields=id,items.id`);

    if (orderRes.status === 401) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 }
      );
    }

    if (!orderRes.ok) {
      return NextResponse.json(
        { error: "Không thể tải đơn hàng" },
        { status: orderRes.status }
      );
    }

    const orderJson = await orderRes.json();
    const orderItems: unknown[] = orderJson?.data?.items ?? [];

    const itemIds = orderItems
      .map((item) => {
        if (typeof item === "string" || typeof item === "number") {
          return String(item);
        }
        if (item && typeof item === "object" && "id" in item) {
          const itemId = (item as { id?: unknown }).id;
          if (typeof itemId === "string" || typeof itemId === "number") {
            return String(itemId);
          }
        }
        return null;
      })
      .filter((itemId): itemId is string => Boolean(itemId));

    for (const itemId of itemIds) {
      const deleteItemRes = await directusFetch(`/items/order_items/${itemId}`, {
        method: "DELETE",
      });

      if (deleteItemRes.status === 401) {
        return NextResponse.json(
          { error: "Không có quyền truy cập" },
          { status: 401 }
        );
      }

      if (!deleteItemRes.ok && deleteItemRes.status !== 404) {
        return NextResponse.json(
          { error: "Không thể xóa chi tiết đơn hàng" },
          { status: deleteItemRes.status }
        );
      }
    }

    const deleteOrderRes = await directusFetch(`/items/orders/${id}`, {
      method: "DELETE",
    });

    if (deleteOrderRes.status === 401) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 }
      );
    }

    if (!deleteOrderRes.ok) {
      const error = await deleteOrderRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: "Không thể xóa đơn hàng", details: error },
        { status: deleteOrderRes.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
