import { NextRequest, NextResponse } from "next/server";
import { directusFetch, getDirectusError } from "@/lib/directus-fetch";
import { setUserRoleCookie } from "@/lib/auth-cookies";
import { normalizeRoleName } from "@/lib/instructor-application";
import {
  fetchCurrentUserProfile,
  fetchLatestApprovedApplicationForUser,
  fetchLatestReactivationRequestForUser,
  resolveInstructorStateForUser,
} from "@/lib/instructor-application-service";

export async function POST(request: NextRequest) {
  try {
    const me = await fetchCurrentUserProfile();

    if (!me.ok || !me.data) {
      return NextResponse.json({ error: "Bạn chưa đăng nhập" }, { status: 401 });
    }

    const role = normalizeRoleName(me.data.role);

    if (role === "admin") {
      await setUserRoleCookie("admin");
      return NextResponse.json({ redirectUrl: "/admin/dashboard" });
    }

    if (role === "instructor") {
      await setUserRoleCookie("instructor");
      return NextResponse.json({ redirectUrl: "/instructor/dashboard" });
    }

    const latestApprovedApplicationResult =
      await fetchLatestApprovedApplicationForUser(me.data.id);

    if (!latestApprovedApplicationResult.ok) {
      return NextResponse.json(
        { error: "Không thể xác minh trạng thái giảng viên" },
        { status: latestApprovedApplicationResult.status || 500 },
      );
    }

    const instructorState = resolveInstructorStateForUser(
      me.data,
      Boolean(latestApprovedApplicationResult.data),
    );

    if (instructorState === "APPROVED") {
      const latestRequestResult = await fetchLatestReactivationRequestForUser(
        me.data.id,
      );

      if (!latestRequestResult.ok) {
        const detail = latestRequestResult.error || "";
        const missingCollection =
          detail.toLowerCase().includes("instructor_reactivation_requests") ||
          detail.toLowerCase().includes("does not exist");

        return NextResponse.json(
          {
            error: missingCollection
              ? "Schema chưa cập nhật cho reactivation request. Vui lòng chạy bootstrap/migration."
              : "Không thể kiểm tra yêu cầu kích hoạt lại",
            detail: detail || null,
          },
          { status: latestRequestResult.status || 500 },
        );
      }

      if (latestRequestResult.data?.status === "PENDING") {
        return NextResponse.json(
          {
            status: "PENDING",
            message: "Yêu cầu kích hoạt lại đã được gửi để Quản trị viên duyệt.",
            request: latestRequestResult.data,
          },
          { status: 202 },
        );
      }

      const body = await request.json().catch(() => null);
      const reason =
        typeof body?.reason === "string" ? body.reason.trim() : null;

      const createRes = await directusFetch(
        "/items/instructor_reactivation_requests",
        {
          method: "POST",
          body: JSON.stringify({
            user_id: me.data.id,
            status: "PENDING",
            reason: reason || null,
            admin_note: null,
          }),
        },
      );

      if (!createRes.ok) {
        const errorMessage = await getDirectusError(
          createRes,
          "Không thể tạo yêu cầu kích hoạt lại",
        );
        return NextResponse.json(
          { error: errorMessage },
          { status: createRes.status || 500 },
        );
      }

      const createdPayload = await createRes.json().catch(() => null);
      const createdRequest = createdPayload?.data ?? null;

      return NextResponse.json(
        {
          status: "PENDING",
          message: "Yêu cầu kích hoạt lại đã được gửi để Quản trị viên duyệt.",
          request: createdRequest,
        },
        { status: 202 },
      );
    }

    if (instructorState === "SUSPENDED") {
      return NextResponse.json(
        { error: "Tài khoản giảng viên đang bị tạm khóa. Vui lòng liên hệ quản trị viên." },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: "Bạn cần đăng ký trở thành giảng viên trước khi vào cổng." },
      { status: 403 },
    );
  } catch (error) {
    console.error("POST /api/instructor/portal/enter error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
