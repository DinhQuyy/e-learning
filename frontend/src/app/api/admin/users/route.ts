import { directusFetch } from "@/lib/directus-fetch";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 20;
  const search = searchParams.get("search") || "";
  const role = searchParams.get("role") || "";
  const status = searchParams.get("status") || "";
  const offset = (page - 1) * limit;

  const filterParts: string[] = [];

  if (search) {
    filterParts.push(
      `filter[_or][0][first_name][_contains]=${encodeURIComponent(search)}`,
      `filter[_or][1][last_name][_contains]=${encodeURIComponent(search)}`,
      `filter[_or][2][email][_contains]=${encodeURIComponent(search)}`
    );
  }

  if (role) {
    filterParts.push(`filter[role][name][_eq]=${encodeURIComponent(role)}`);
  }

  if (status) {
    filterParts.push(`filter[status][_eq]=${encodeURIComponent(status)}`);
  }

  const filterStr = filterParts.length > 0 ? `&${filterParts.join("&")}` : "";

  try {
    const url = `/users?fields=id,first_name,last_name,email,avatar,status,date_created,role.id,role.name&sort=-date_created&limit=${limit}&offset=${offset}&meta=filter_count,total_count${filterStr}`;

    const res = await directusFetch(url);

    if (res.status === 401) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 }
      );
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: "Không thể tải danh sách người dùng", details: error },
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
