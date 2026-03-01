import { NextRequest, NextResponse } from "next/server";
import { directusFetch } from "@/lib/directus-fetch";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const res = await directusFetch(
      `/items/orders/${id}?fields=*,items.id,items.course_id.id,items.course_id.title,items.course_id.slug,items.course_id.thumbnail,items.price`
    );

    if (res.status === 401) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    if (!res.ok) return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 });
    const data = await res.json();
    return NextResponse.json({ data: data.data });
  } catch {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
