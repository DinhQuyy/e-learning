import { NextResponse } from "next/server";
import {
  canReapplyAfterRejected,
  fetchCurrentUserProfile,
  fetchLatestApplicationForUser,
  getProfileEligibilityError,
  hasPendingApplication,
} from "@/lib/instructor-application-service";

export async function GET() {
  try {
    const me = await fetchCurrentUserProfile();

    if (!me.ok || !me.data) {
      return NextResponse.json(
        { error: "Bạn chưa đăng nhập" },
        { status: me.status || 401 },
      );
    }

    const latestResult = await fetchLatestApplicationForUser(me.data.id);

    if (!latestResult.ok) {
      return NextResponse.json(
        { error: "Không thể tải thông tin đơn đăng ký" },
        { status: latestResult.status || 500 },
      );
    }

    const application = latestResult.data;
    const profileError = getProfileEligibilityError(me.data);

    let canApply = profileError === null;
    let canResubmit = application?.status === "NEEDS_INFO";
    let reason: string | null = profileError;
    let nextApplyAt: string | null = null;

    if (application?.status === "PENDING") {
      canApply = false;
      canResubmit = false;
      reason = "Bạn đã có đơn đang chờ duyệt";
    }

    if (application?.status === "NEEDS_INFO") {
      canApply = false;
      canResubmit = true;
      reason = "Đơn của bạn cần bổ sung thông tin";
    }

    if (application?.status === "APPROVED") {
      canApply = false;
      canResubmit = false;
      reason = "Bạn đã được duyệt trở thành giảng viên";
    }

    if (application?.status === "REJECTED") {
      const cooldown = canReapplyAfterRejected(application);
      if (!cooldown.canApply) {
        canApply = false;
        canResubmit = false;
        nextApplyAt = cooldown.nextApplyAt;
        reason = "Bạn cần chờ thêm trước khi nộp đơn mới";
      }
    }

    const hasBlockingApplication = await hasPendingApplication(me.data.id);
    if (hasBlockingApplication && application?.status !== "NEEDS_INFO") {
      canApply = false;
      reason = "Bạn đã có đơn đang xử lý";
    }

    return NextResponse.json({
      application,
      can_apply: canApply,
      can_resubmit: canResubmit,
      reason,
      next_apply_at: nextApplyAt,
    });
  } catch (error) {
    console.error("GET /api/instructor-application/me error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống" },
      { status: 500 },
    );
  }
}
