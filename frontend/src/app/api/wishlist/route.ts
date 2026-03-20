import { NextRequest, NextResponse } from "next/server";
import { directusFetch, getCurrentUserId } from "@/lib/directus-fetch";
import { WISHLIST_ITEM_FIELDS } from "@/lib/directus-fields";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

interface WishlistCourseRef {
  id?: string | null;
}

interface WishlistItemRow {
  course_id?: string | WishlistCourseRef | null;
  [key: string]: unknown;
}

export async function GET() {
  try {
    const res = await directusFetch(
      `/items/wishlists?fields=${WISHLIST_ITEM_FIELDS}&sort=-date_created`
    );

    if (res.status === 401) {
      return NextResponse.json(
        { error: "Chưa đăng nhập" },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: "Không thể tải wishlist" },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }

    const data = await res.json();
    const items: WishlistItemRow[] = Array.isArray(data?.data)
      ? (data.data as WishlistItemRow[])
      : [];

    const filtered = items.filter((item) => {
      const course = item?.course_id;
      if (!course || typeof course !== "object") return false;
      const courseRef = course as WishlistCourseRef;
      return typeof courseRef.id === "string" && courseRef.id.length > 0;
    });

    return NextResponse.json(
      { data: filtered },
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

    if (!res.ok) {
      return NextResponse.json(
        { error: "Không thể thêm vào wishlist" },
        { status: 500 }
      );
    }

    const data = await res.json();
    return NextResponse.json(
      { data: data.data, removed: false },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
