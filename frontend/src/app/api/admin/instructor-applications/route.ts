import { NextRequest, NextResponse } from "next/server";
import { directusFetch } from "@/lib/directus-fetch";
import {
  APPLICATION_FIELDS_WITH_USER,
  fetchCurrentUserProfile,
  isAdminUser,
} from "@/lib/instructor-application-service";

const ALLOWED_STATUS = [
  "PENDING",
  "NEEDS_INFO",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
  "ALL",
] as const;

export async function GET(request: NextRequest) {
  try {
    const me = await fetchCurrentUserProfile();

    if (!me.ok || !me.data) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!isAdminUser(me.data)) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const statusParam = (searchParams.get("status") || "PENDING").toUpperCase();
    const status = ALLOWED_STATUS.includes(statusParam as (typeof ALLOWED_STATUS)[number])
      ? (statusParam as (typeof ALLOWED_STATUS)[number])
      : "PENDING";

    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "20");
    const offset = Math.max(0, (page - 1) * limit);

    const filterParts: string[] = [];
    if (status !== "ALL") {
      filterParts.push(`filter[status][_eq]=${encodeURIComponent(status)}`);
    }

    const filterQuery =
      filterParts.length > 0 ? `&${filterParts.join("&")}` : "";

    const res = await directusFetch(
      `/items/instructor_applications?fields=${encodeURIComponent(
        APPLICATION_FIELDS_WITH_USER,
      )}&sort=-date_created&limit=${limit}&offset=${offset}&meta=filter_count,total_count${filterQuery}`,
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Không thể tải danh sách đơn" },
        { status: res.status || 500 },
      );
    }

    const payload = await res.json().catch(() => null);

    return NextResponse.json({
      data: payload?.data ?? [],
      meta: payload?.meta ?? null,
    });
  } catch (error) {
    console.error("GET /api/admin/instructor-applications error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
