import { NextRequest, NextResponse } from "next/server";
import { directusFetch, getCurrentUserId } from "@/lib/directus-fetch";

export async function GET() {
  try {
    const res = await directusFetch(
      "/items/cart_items?fields=*,course_id.id,course_id.title,course_id.slug,course_id.thumbnail,course_id.price,course_id.discount_price,course_id.instructors.user_id.first_name,course_id.instructors.user_id.last_name&sort=-date_created"
    );

    if (res.status === 401) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    if (!res.ok) return NextResponse.json({ error: "Không thể tải giỏ hàng" }, { status: 500 });
    const data = await res.json();
    return NextResponse.json({ data: data.data ?? [] });
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

    // Check not already enrolled
    const enrollCheck = await directusFetch(
      `/items/enrollments?filter[course_id][_eq]=${course_id}&limit=1`
    );
    if (enrollCheck.ok) {
      const enrollData = await enrollCheck.json();
      if (enrollData.data?.length > 0) {
        return NextResponse.json({ error: "Bạn đã đăng ký khoá học này" }, { status: 409 });
      }
    }

    // Check not already in cart
    const cartCheck = await directusFetch(
      `/items/cart_items?filter[course_id][_eq]=${course_id}&limit=1`
    );
    if (cartCheck.ok) {
      const cartData = await cartCheck.json();
      if (cartData.data?.length > 0) {
        return NextResponse.json({ error: "Khoá học đã có trong giỏ hàng" }, { status: 409 });
      }
    }

    const res = await directusFetch("/items/cart_items", {
      method: "POST",
      body: JSON.stringify({ course_id, user_id: userId }),
    });

    if (!res.ok) return NextResponse.json({ error: "Không thể thêm vào giỏ hàng" }, { status: 500 });
    const data = await res.json();
    return NextResponse.json({ data: data.data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
