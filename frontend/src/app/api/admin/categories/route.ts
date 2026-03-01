import { NextRequest, NextResponse } from "next/server";
import { directusFetch } from "@/lib/directus-fetch";

export async function GET() {
  try {
    // Get categories
    const res = await directusFetch(
      "/items/categories?fields=id,name,slug,description,icon,parent_id,sort,status&sort=sort&limit=-1"
    );

    if (res.status === 401) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: "Không thể tải danh mục" },
        { status: res.status }
      );
    }

    const categoriesData = await res.json();
    const categories = categoriesData.data ?? [];

    // Get course counts per category
    const countsRes = await directusFetch(
      "/items/courses?groupBy[]=category_id&aggregate[count]=id"
    );

    const countMap: Record<number, number> = {};
    if (countsRes.ok) {
      const countsData = await countsRes.json();
      for (const item of countsData.data ?? []) {
        if (item.category_id) {
          countMap[item.category_id] = Number(item.count?.id ?? 0);
        }
      }
    }

    // Attach course counts
    const enriched = categories.map(
      (cat: { id: number; parent_id: number | { id: number } | null }) => ({
        ...cat,
        parent_id:
          typeof cat.parent_id === "object" && cat.parent_id !== null
            ? cat.parent_id.id
            : cat.parent_id,
        course_count: countMap[cat.id] ?? 0,
      })
    );

    return NextResponse.json({ data: enriched });
  } catch {
    return NextResponse.json(
      { error: "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const createData = {
      name: body.name,
      slug: body.slug,
      description: body.description ?? null,
      icon: body.icon ?? null,
      parent_id: body.parent_id ?? null,
      status: body.status ?? "published",
      sort: body.sort ?? 0,
    };

    const res = await directusFetch("/items/categories", {
      method: "POST",
      body: JSON.stringify(createData),
    });

    if (res.status === 401) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 }
      );
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: "Không thể tạo danh mục", details: error },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
