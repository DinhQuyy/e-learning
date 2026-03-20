import { NextRequest, NextResponse } from "next/server";
import { directusFetch, getCurrentUserId } from "@/lib/directus-fetch";
import { CART_ITEM_FIELDS } from "@/lib/directus-fields";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET() {
  try {
    const res = await directusFetch(
      `/items/cart_items?fields=${CART_ITEM_FIELDS}&sort=-date_created`
    );

    if (res.status === 401) {
      return NextResponse.json(
        { error: "Chưa đăng nhập" },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: "Không thể tải giỏ hàng" },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }

    const data = await res.json();
    return NextResponse.json(
      { data: data.data ?? [] },
      { headers: NO_STORE_HEADERS }
    );
  } catch {
    return NextResponse.json(
      { error: "Lỗi hệ thống" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { course_id } = await request.json();
    if (!course_id) {
      return NextResponse.json({ error: "Thiếu course_id" }, { status: 400 });
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Không xác định được người dùng" },
        { status: 401 }
      );
    }

    const enrollCheck = await directusFetch(
      `/items/enrollments?filter[course_id][_eq]=${course_id}&limit=1`
    );
    if (enrollCheck.ok) {
      const enrollData = await enrollCheck.json();
      if (enrollData.data?.length > 0) {
        return NextResponse.json(
          { error: "Bạn đã đăng ký khóa học này" },
          { status: 409 }
        );
      }
    }

    const cartCheck = await directusFetch(
      `/items/cart_items?filter[course_id][_eq]=${course_id}&limit=1`
    );
    if (cartCheck.ok) {
      const cartData = await cartCheck.json();
      if (cartData.data?.length > 0) {
        return NextResponse.json(
          { error: "Khóa học đã có trong giỏ hàng" },
          { status: 409 }
        );
      }
    }

    const res = await directusFetch("/items/cart_items", {
      method: "POST",
      body: JSON.stringify({ course_id, user_id: userId }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Không thể thêm vào giỏ hàng" },
        { status: 500 }
      );
    }

    const data = await res.json();
    return NextResponse.json({ data: data.data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
