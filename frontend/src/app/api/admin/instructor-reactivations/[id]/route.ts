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
        { error: "Khong co quyen truy cap" },
        { status: 403 },
      );
    }

    const result = await fetchReactivationRequestById(id);

    if (!result.ok || !result.data) {
      return NextResponse.json(
        { error: "Khong tim thay yeu cau kich hoat lai" },
        { status: result.status === 404 ? 404 : 400 },
      );
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error("GET /api/admin/instructor-reactivations/[id] error:", error);
    return NextResponse.json({ error: "Loi he thong" }, { status: 500 });
  }
}

