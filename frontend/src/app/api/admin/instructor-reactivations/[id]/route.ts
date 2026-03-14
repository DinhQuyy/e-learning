import { NextResponse } from "next/server";
import {
  fetchCurrentUserProfile,
  fetchReactivationRequestById,
  isAdminUser,
} from "@/lib/instructor-application-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

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

    const result = await fetchReactivationRequestById(id);

    if (!result.ok || !result.data) {
      return NextResponse.json(
        { error: "Không tìm thấy yêu cầu kích hoạt lại" },
        { status: result.status === 404 ? 404 : 400 },
      );
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error("GET /api/admin/instructor-reactivations/[id] error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

