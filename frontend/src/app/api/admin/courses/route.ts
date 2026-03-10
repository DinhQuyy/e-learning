import { directusFetch } from "@/lib/directus-fetch";
import { sanitizePagination, sanitizeSearch } from "@/lib/validations";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const { limit, offset } = sanitizePagination(
    searchParams.get("page"),
    searchParams.get("limit")
  );
  const search = sanitizeSearch(searchParams.get("search"));
  const status = searchParams.get("status") || "";

  const filterParts: string[] = [];

  if (search) {
    filterParts.push(
      `filter[title][_icontains]=${encodeURIComponent(search)}`
    );
  }

  if (status) {
    filterParts.push(`filter[status][_eq]=${encodeURIComponent(status)}`);
  }

  const filterStr = filterParts.length > 0 ? `&${filterParts.join("&")}` : "";

  try {
    const url = `/items/courses?fields=id,title,slug,thumbnail,status,is_featured,total_enrollments,average_rating,date_created,category_id.id,category_id.name,instructors.user_id.id,instructors.user_id.first_name,instructors.user_id.last_name&sort=-date_created&limit=${limit}&offset=${offset}&meta=filter_count,total_count${filterStr}`;

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
        { error: "Không thể tải danh sách khoá học", details: error },
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
