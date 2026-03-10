import { NextRequest, NextResponse } from "next/server";
import { directusFetch, getCurrentUserId } from "@/lib/directus-fetch";

export async function GET() {
  try {
    const res = await directusFetch(
      "/items/wishlists?fields=*,course_id.id,course_id.title,course_id.slug,course_id.thumbnail,course_id.price,course_id.discount_price,course_id.average_rating,course_id.total_enrollments&sort=-date_created"
    );

    if (res.status === 401) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    if (!res.ok) return NextResponse.json({ error: "Không thể tải wishlist" }, { status: 500 });
    const data = await res.json();
    const items = Array.isArray(data?.data) ? data.data : [];

    // Hide orphan wishlist rows where the related course is missing/inaccessible.
    const filtered = items.filter((item) => {
      const course = item?.course_id;
      return Boolean(
        course &&
          typeof course === "object" &&
          typeof course.id === "string" &&
          course.id.length > 0
      );
    });

    return NextResponse.json({ data: filtered });
  } catch {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { course_id } = await request.json();
    if (!course_id) return NextResponse.json({ error: "Thiếu course_id" }, { status: 400 });

    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Không xác định được người dùng" }, { status: 401 });

    // Check if already in wishlist — if so, remove it (toggle)
    const checkRes = await directusFetch(
      `/items/wishlists?filter[course_id][_eq]=${course_id}&limit=1`
    );

    if (checkRes.ok) {
      const checkData = await checkRes.json();
      if (checkData.data?.length > 0) {
        const existingId = checkData.data[0].id;
        await directusFetch(`/items/wishlists/${existingId}`, {
          method: "DELETE",
        });
        return NextResponse.json({ data: null, removed: true });
      }
    }

    const res = await directusFetch("/items/wishlists", {
      method: "POST",
      body: JSON.stringify({ course_id, user_id: userId }),
    });

    if (!res.ok) return NextResponse.json({ error: "Không thể thêm vào wishlist" }, { status: 500 });
    const data = await res.json();
    return NextResponse.json({ data: data.data, removed: false }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
