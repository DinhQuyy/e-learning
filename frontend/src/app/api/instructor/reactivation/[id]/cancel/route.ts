import { NextResponse } from "next/server";
import { directusFetch, getDirectusError } from "@/lib/directus-fetch";
import {
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

    const requestRes = await directusFetch(
      `/items/instructor_reactivation_requests/${encodeURIComponent(
        id,
      )}?fields=id,user_id,status`,
    );

    if (!requestRes.ok) {
      if (requestRes.status === 404) {
        return NextResponse.json(
          { error: "Không tìm thấy yêu cầu kích hoạt lại" },
          { status: 404 },
        );
      }

      const detail = await getDirectusError(
        requestRes,
        "Không thể tải yêu cầu kích hoạt lại",
      );
      return NextResponse.json(
        { error: detail },
        { status: requestRes.status || 500 },
      );
    }

    const requestPayload = await requestRes.json().catch(() => null);
    const requestData = requestPayload?.data as
      | { id: string; user_id: string | { id?: string | null }; status: string }
      | null;

    if (!requestData?.id) {
      return NextResponse.json(
        { error: "Không tìm thấy yêu cầu kích hoạt lại" },
        { status: 404 },
      );
    }

    const ownerId =
      typeof requestData.user_id === "string"
        ? requestData.user_id
        : requestData.user_id?.id;

    if (ownerId !== me.data.id) {
      return NextResponse.json(
        { error: "Bạn không có quyền thao tác yêu cầu này" },
        { status: 403 },
      );
    }

    if (requestData.status !== "PENDING") {
      return NextResponse.json(
        { error: "Chỉ có thể hủy yêu cầu đang chờ duyệt" },
        { status: 400 },
      );
    }

    const updateRes = await directusFetch(
      `/items/instructor_reactivation_requests/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          status: "CANCELLED",
        }),
      },
    );

    if (!updateRes.ok) {
      const errorMessage = await getDirectusError(
        updateRes,
        "Không thể hủy yêu cầu kích hoạt lại",
      );
      return NextResponse.json(
        { error: errorMessage },
        { status: updateRes.status || 500 },
      );
    }

    const payload = await updateRes.json().catch(() => null);
    return NextResponse.json({ data: payload?.data ?? null });
  } catch (error) {
    console.error(
      "POST /api/instructor/reactivation/[id]/cancel error:",
      error,
    );
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
