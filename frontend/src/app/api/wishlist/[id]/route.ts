import { NextRequest, NextResponse } from "next/server";
import { directusFetch } from "@/lib/directus-fetch";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const res = await directusFetch(`/items/wishlists/${id}`, {
      method: "DELETE",
    });

    if (res.status === 401) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    if (!res.ok) return NextResponse.json({ error: "Không thể xoá" }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
