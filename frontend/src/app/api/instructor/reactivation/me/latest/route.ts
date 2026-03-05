import { NextResponse } from "next/server";
import { setUserRoleCookie } from "@/lib/auth-cookies";
import { normalizeRoleName } from "@/lib/instructor-application";
import {
  fetchCurrentUserProfile,
  fetchLatestApprovedApplicationForUser,
  fetchLatestReactivationRequestForUser,
  resolveInstructorStateForUser,
} from "@/lib/instructor-application-service";

export async function GET() {
  try {
    const me = await fetchCurrentUserProfile();

    if (!me.ok || !me.data) {
      return NextResponse.json({ error: "Bạn chưa đăng nhập" }, { status: 401 });
    }

    const role = normalizeRoleName(me.data.role);
    const hasInstructorRole = role === "instructor";

    if (role === "admin") {
      await setUserRoleCookie("admin");
    } else if (hasInstructorRole) {
      await setUserRoleCookie("instructor");
    } else {
      await setUserRoleCookie("student");
    }

    const latestApprovedApplicationResult =
      await fetchLatestApprovedApplicationForUser(me.data.id);

    if (!latestApprovedApplicationResult.ok) {
      return NextResponse.json(
        { error: "Không thể xác minh trạng thái giảng viên" },
        { status: latestApprovedApplicationResult.status || 500 },
      );
    }

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
            : "Không thể tải yêu cầu kích hoạt lại",
          detail: detail || null,
        },
        { status: latestRequestResult.status || 500 },
      );
    }

    const instructorState = resolveInstructorStateForUser(
      me.data,
      Boolean(latestApprovedApplicationResult.data),
    );

    return NextResponse.json({
      has_instructor_role: hasInstructorRole,
      instructor_state: instructorState,
      request: latestRequestResult.data,
      can_enter_portal: hasInstructorRole || role === "admin",
    });
  } catch (error) {
    console.error("GET /api/instructor/reactivation/me/latest error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
