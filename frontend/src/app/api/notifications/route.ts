import { NextRequest, NextResponse } from "next/server";
import { directusFetch } from "@/lib/directus-fetch";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") || "20";
    const offset = searchParams.get("offset") || "0";

    const res = await directusFetch(
      `/items/notifications?sort=-date_created&limit=${limit}&offset=${offset}&meta=filter_count`
    );

    if (res.status === 401) {
      return NextResponse.json(
        { error: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: "Không thể tải thông báo" },
        { status: 500 }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      data: data.data ?? [],
      total: data.meta?.filter_count ?? 0,
    });
  } catch {
    return NextResponse.json(
      { error: "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
