import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { directusFetch, getDirectusError } from "@/lib/directus-fetch";
import {
  coerceSubmissionInput,
  normalizeApplicationPayload,
} from "@/lib/instructor-application";
import {
  canReapplyAfterRejected,
  createApplicationHistory,
  fetchCurrentUserProfile,
  fetchLatestApplicationForUser,
  getProfileEligibilityError,
  hasPendingApplication,
  validateDocumentReferences,
} from "@/lib/instructor-application-service";

export async function POST(request: NextRequest) {
  try {
    const me = await fetchCurrentUserProfile();

    if (!me.ok || !me.data) {
      return NextResponse.json({ error: "Bạn chưa đăng nhập" }, { status: 401 });
    }

    const profileError = getProfileEligibilityError(me.data);
    if (profileError) {
      return NextResponse.json({ error: profileError }, { status: 400 });
    }

    if (await hasPendingApplication(me.data.id)) {
      return NextResponse.json(
        { error: "Bạn đang có đơn PENDING/NEEDS_INFO" },
        { status: 409 },
      );
    }

    const latestResult = await fetchLatestApplicationForUser(me.data.id);
    if (!latestResult.ok) {
      return NextResponse.json(
        { error: "Không thể kiểm tra lịch sử đơn" },
        { status: latestResult.status || 500 },
      );
    }

    if (latestResult.data?.status === "APPROVED") {
      return NextResponse.json(
        {
          error:
            "Bạn đã từng được duyệt giảng viên. Vui lòng gửi yêu cầu kích hoạt lại.",
        },
        { status: 409 },
      );
    }

    const cooldown = canReapplyAfterRejected(latestResult.data);
    if (!cooldown.canApply) {
      return NextResponse.json(
        {
          error: "Bạn cần chờ thêm trước khi nộp đơn mới",
          next_apply_at: cooldown.nextApplyAt,
        },
        { status: 429 },
      );
    }

    const body = await request.json().catch(() => null);
    const normalized = normalizeApplicationPayload(coerceSubmissionInput(body));

    const documentValidation = await validateDocumentReferences(
      normalized.document_urls,
    );

    if (!documentValidation.ok) {
      return NextResponse.json(
        { error: documentValidation.error },
        { status: 400 },
      );
    }

    const createRes = await directusFetch("/items/instructor_applications", {
      method: "POST",
      body: JSON.stringify({
        user_id: me.data.id,
        track: normalized.track,
        expertise_categories: normalized.expertise_categories,
        expertise_description: normalized.expertise_description,
        portfolio_links: normalized.portfolio_links,
        demo_video_link: normalized.demo_video_link || null,
        course_outline: normalized.course_outline || null,
        document_urls: normalized.document_urls,
        terms_accepted: true,
        status: "PENDING",
      }),
    });

    if (!createRes.ok) {
      const errorMessage = await getDirectusError(
        createRes,
        "Không thể tạo đơn đăng ký",
      );
      return NextResponse.json(
        { error: errorMessage },
        { status: createRes.status || 500 },
      );
    }

    const createdPayload = await createRes.json().catch(() => null);
    const createdApplication = createdPayload?.data;

    if (createdApplication?.id) {
      await createApplicationHistory(
        createdApplication.id,
        null,
        "PENDING",
        me.data.id,
        "Submitted application",
      );
    }

    return NextResponse.json(
      { data: createdApplication },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0]?.message || "Dữ liệu không hợp lệ";
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }

    console.error("POST /api/instructor-application error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
