import { directusFetch } from "@/lib/directus-fetch";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await directusFetch(`/roles?fields=id,name&sort=name`);

    if (res.status === 401) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: "Không thể tải danh sách vai trò" },
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
