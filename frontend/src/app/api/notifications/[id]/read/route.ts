import { NextRequest, NextResponse } from "next/server";
import { directusFetch } from "@/lib/directus-fetch";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const res = await directusFetch(`/items/notifications/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_read: true }),
    });

    if (res.status === 401) {
      return NextResponse.json(
        { error: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: "Không thể cập nhật thông báo" },
        { status: 500 }
      );
    }

    const data = await res.json();
    return NextResponse.json({ data: data.data });
  } catch {
    return NextResponse.json(
      { error: "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
