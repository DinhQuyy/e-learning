import { NextRequest, NextResponse } from "next/server";
import { directusFetch } from "@/lib/directus-fetch";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 50;
    const offset = (page - 1) * limit;

    const filterParts: string[] = [];
    if (status && status !== "all") {
      filterParts.push(`filter[status][_eq]=${encodeURIComponent(status)}`);
    }

    const filterStr = filterParts.length > 0 ? `&${filterParts.join("&")}` : "";

    const url = `/items/reviews?fields=id,rating,comment,status,date_created,user_id.id,user_id.first_name,user_id.last_name,user_id.avatar,user_id.email,course_id.id,course_id.title,course_id.slug&sort=-date_created&limit=${limit}&offset=${offset}&meta=filter_count,total_count${filterStr}`;

    const res = await directusFetch(url);

    if (res.status === 401) {
      return NextResponse.json({ error: "Chưa xác thực." }, { status: 401 });
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: "Không thể tải danh sách đánh giá." },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET reviews error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
  }
}
