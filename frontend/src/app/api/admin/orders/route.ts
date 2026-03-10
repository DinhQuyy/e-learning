import { directusFetch } from "@/lib/directus-fetch";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 20;
  const status = searchParams.get("status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const offset = (page - 1) * limit;

  try {
    const filters: string[] = [];
    if (status && status !== "all") {
      filters.push(`filter[status][_eq]=${encodeURIComponent(status)}`);
    }
    if (from) {
      filters.push(`filter[date_created][_gte]=${encodeURIComponent(from)}T00:00:00`);
    }
    if (to) {
      filters.push(`filter[date_created][_lte]=${encodeURIComponent(to)}T23:59:59`);
    }
    const filterStr = filters.length > 0 ? `&${filters.join("&")}` : "";

    const res = await directusFetch(
      `/items/orders?fields=id,order_number,total_amount,status,payment_method,payment_ref,date_created,paid_at,user_id.id,user_id.first_name,user_id.last_name,user_id.email,items.id,items.course_id.id,items.course_id.title,items.price&sort=-date_created&limit=${limit}&offset=${offset}&meta=filter_count,total_count${filterStr}`
    );

    if (res.status === 401) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: "Không thể tải danh sách đơn hàng" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
