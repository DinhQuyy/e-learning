import { NextResponse } from "next/server";
import { directusFetch } from "@/lib/directus-fetch";

export async function GET() {
  try {
    const res = await directusFetch(
      "/items/categories?filter[status][_eq]=published&fields=id,name,slug,description,icon,parent_id,sort&sort=sort&limit=-1"
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Không thể tải danh mục" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ data: data.data ?? [] });
  } catch {
    return NextResponse.json(
      { error: "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
