import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { directusFetch, getDirectusError } from "@/lib/directus-fetch";
import {
  coerceSubmissionInput,
  normalizeApplicationPayload,
} from "@/lib/instructor-application";
import {
  createApplicationHistory,
  fetchApplicationById,
  fetchCurrentUserProfile,
  getProfileEligibilityError,
  validateDocumentReferences,
} from "@/lib/instructor-application-service";

export async function PUT(
  request: NextRequest,
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
        { error: "Bạn không có quyền cập nhật đơn này" },
        { status: 403 },
      );
    }

    if (existing.status !== "NEEDS_INFO") {
      return NextResponse.json(
        { error: "Chỉ được bổ sung khi đơn ở trạng thái NEEDS_INFO" },
        { status: 400 },
      );
    }

    const profileError = getProfileEligibilityError(me.data);
    if (profileError) {
      return NextResponse.json({ error: profileError }, { status: 400 });
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

    const updateRes = await directusFetch(
      `/items/instructor_applications/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify({
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
      },
    );

    if (!updateRes.ok) {
      const errorMessage = await getDirectusError(
        updateRes,
        "Không thể cập nhật đơn đăng ký",
      );
      return NextResponse.json(
        { error: errorMessage },
        { status: updateRes.status || 500 },
      );
    }

    const updatedPayload = await updateRes.json().catch(() => null);
    const updatedApplication = updatedPayload?.data;

    await createApplicationHistory(
      id,
      existing.status,
      "PENDING",
      me.data.id,
      "Resubmitted after NEEDS_INFO",
    );

    return NextResponse.json({ data: updatedApplication });
  } catch (error) {
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0]?.message || "Dữ liệu không hợp lệ";
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }

    console.error("PUT /api/instructor-application/[id] error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
