import { NextResponse } from "next/server";
import { directusFetch } from "@/lib/directus-fetch";

export async function PATCH() {
  try {
    // Get all unread notification IDs
    const listRes = await directusFetch(
      `/items/notifications?filter[is_read][_eq]=false&fields=id&limit=-1`
    );

    if (listRes.status === 401) {
      return NextResponse.json(
        { error: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    if (!listRes.ok) {
      return NextResponse.json(
        { error: "Không thể tải thông báo" },
        { status: 500 }
      );
    }

    const listData = await listRes.json();
    const ids = (listData.data || []).map(
      (n: { id: number }) => n.id
    );

    if (ids.length === 0) {
      return NextResponse.json({ data: { updated: 0 } });
    }

    // Batch update all unread notifications
    const updateRes = await directusFetch(`/items/notifications`, {
      method: "PATCH",
      body: JSON.stringify({
        keys: ids,
        data: { is_read: true },
      }),
    });

    if (!updateRes.ok) {
      return NextResponse.json(
        { error: "Không thể cập nhật thông báo" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: { updated: ids.length } });
  } catch {
    return NextResponse.json(
      { error: "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
