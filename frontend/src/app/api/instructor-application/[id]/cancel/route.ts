import { NextResponse } from "next/server";
import { directusFetch, getDirectusError } from "@/lib/directus-fetch";
import {
  createApplicationHistory,
  fetchApplicationById,
  fetchCurrentUserProfile,
} from "@/lib/instructor-application-service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const me = await fetchCurrentUserProfile();

    if (!me.ok || !me.data) {
      return NextResponse.json({ error: "Bạn chưa đăng nhập" }, { status: 401 });
    }

    const existingResult = await fetchApplicationById(id);

    if (!existingResult.ok || !existingResult.data) {
      return NextResponse.json(
        { error: "Không tìm thấy đơn đăng ký" },
        { status: existingResult.status === 404 ? 404 : 400 },
      );
    }

    const existing = existingResult.data;
    const ownerId =
      typeof existing.user_id === "string" ? existing.user_id : existing.user_id?.id;

    if (ownerId !== me.data.id) {
      return NextResponse.json(
        { error: "Bạn không có quyền hủy đơn này" },
        { status: 403 },
      );
    }

    if (existing.status !== "PENDING" && existing.status !== "NEEDS_INFO") {
      return NextResponse.json(
        { error: "Chỉ được hủy đơn khi đang chờ duyệt hoặc cần bổ sung" },
        { status: 400 },
      );
    }

    const cancelRes = await directusFetch(
      `/items/instructor_applications/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ status: "CANCELLED" }),
      },
    );

    if (!cancelRes.ok) {
      const errorMessage = await getDirectusError(cancelRes, "Không thể hủy đơn");
      return NextResponse.json(
        { error: errorMessage },
        { status: cancelRes.status || 500 },
      );
    }

    await createApplicationHistory(
      id,
      existing.status,
      "CANCELLED",
      me.data.id,
      "Cancelled by applicant",
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/instructor-application/[id]/cancel error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
