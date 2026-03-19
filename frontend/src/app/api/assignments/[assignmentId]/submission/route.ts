import { NextRequest, NextResponse } from "next/server";

import { asArray } from "@/lib/assignment-route-utils";
import { normalizeSubmission } from "@/lib/assignment-presenters";
import { directusAdminFetch } from "@/lib/directus-admin";
import { directusFetch, getCurrentUserId, getDirectusError } from "@/lib/directus-fetch";
import { ensureEnrollment } from "@/lib/ai-auth";

async function getStudentAssignmentContext(
  assignmentId: string,
  userId: string
) {
  const assignmentRes = await directusFetch(
    `/items/assignments/${encodeURIComponent(
      assignmentId
    )}?fields=id,title,status,lesson_id.id,lesson_id.title,lesson_id.module_id.course_id.id`
  );
  if (!assignmentRes.ok) {
    return null;
  }
  const payload = await assignmentRes.json().catch(() => null);
  const assignment = payload?.data;
  const courseId = assignment?.lesson_id?.module_id?.course_id?.id;
  if (!assignment?.id || !courseId) {
    return null;
  }
  const enrolled = await ensureEnrollment(userId, String(courseId));
  if (!enrolled) {
    return null;
  }
  return {
    assignmentId: String(assignment.id),
    courseId: String(courseId),
    status: String(assignment.status ?? "draft"),
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const { assignmentId } = await params;
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const context = await getStudentAssignmentContext(assignmentId, userId);
    if (!context) {
      return NextResponse.json({ error: "Không có quyền truy cập assignment này." }, { status: 403 });
    }

    const res = await directusAdminFetch(
      `/items/assignment_submissions?filter[assignment_id][_eq]=${encodeURIComponent(
        assignmentId
      )}&filter[user_id][_eq]=${encodeURIComponent(
        userId
      )}&fields=id,status,body_text,reference_url,submitted_at,reviewed_at,review.id,review.status,review.final_score,review.criterion_scores,review.final_feedback,review.reviewer_id.id,review.reviewer_id.first_name,review.reviewer_id.last_name&sort=-submitted_at,-date_created,-id&limit=1`
    );
    if (!res.ok) {
      return NextResponse.json(
        { error: await getDirectusError(res, "Không thể tải bài nộp.") },
        { status: res.status }
      );
    }
    const payload = await res.json().catch(() => null);
    const row = Array.isArray(payload?.data) ? payload.data[0] : null;
    return NextResponse.json({ data: normalizeSubmission(row) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể tải bài nộp." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const { assignmentId } = await params;
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const context = await getStudentAssignmentContext(assignmentId, userId);
    if (!context) {
      return NextResponse.json({ error: "Không có quyền truy cập assignment này." }, { status: 403 });
    }
    if (context.status !== "published") {
      return NextResponse.json({ error: "Assignment chưa được xuất bản." }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const bodyText = String(body?.body_text ?? "").trim();
    const referenceUrl = body?.reference_url ? String(body.reference_url).trim() : null;
    if (!bodyText) {
      return NextResponse.json({ error: "Thiếu nội dung bài nộp." }, { status: 400 });
    }

    const existingRes = await directusAdminFetch(
      `/items/assignment_submissions?filter[assignment_id][_eq]=${encodeURIComponent(
        assignmentId
      )}&filter[user_id][_eq]=${encodeURIComponent(
        userId
      )}&fields=id,status,review.id,review.status&limit=1`
    );
    if (!existingRes.ok) {
      return NextResponse.json(
        { error: await getDirectusError(existingRes, "Không thể kiểm tra bài nộp hiện có.") },
        { status: existingRes.status }
      );
    }
    const existingPayload = await existingRes.json().catch(() => null);
    const existing = Array.isArray(existingPayload?.data) ? existingPayload.data[0] : null;
    const existingReview =
      existing && typeof existing === "object"
        ? (asArray((existing as Record<string, unknown>).review)[0] ??
          (existing as Record<string, unknown>).review)
        : null;
    const existingReviewId =
      existingReview && typeof existingReview === "object"
        ? String((existingReview as Record<string, unknown>).id ?? "").trim()
        : "";
    if (existingReviewId) {
      return NextResponse.json(
        { error: "Giảng viên đã bắt đầu review bài nộp này, bạn không thể cập nhật nữa." },
        { status: 400 }
      );
    }

    const submissionRes = await directusAdminFetch(
      existing?.id
        ? `/items/assignment_submissions/${encodeURIComponent(String(existing.id))}`
        : "/items/assignment_submissions",
      {
        method: existing?.id ? "PATCH" : "POST",
        body: JSON.stringify({
          assignment_id: assignmentId,
          user_id: userId,
          body_text: bodyText,
          reference_url: referenceUrl,
          status: "submitted",
          submitted_at: new Date().toISOString(),
        }),
      }
    );
    if (!submissionRes.ok) {
      return NextResponse.json(
        { error: await getDirectusError(submissionRes, "Không thể lưu bài nộp.") },
        { status: submissionRes.status }
      );
    }

    const saved = await submissionRes.json().catch(() => null);
    const savedId = saved?.data?.id ? String(saved.data.id) : String(existing?.id ?? "");
    const finalRes = await directusAdminFetch(
      `/items/assignment_submissions/${encodeURIComponent(
        savedId
      )}?fields=id,status,body_text,reference_url,submitted_at,reviewed_at,review.id,review.status,review.final_score,review.criterion_scores,review.final_feedback`
    );
    if (!finalRes.ok) {
      return NextResponse.json({ data: { id: savedId } });
    }
    const finalPayload = await finalRes.json().catch(() => null);
    return NextResponse.json({ data: normalizeSubmission(finalPayload?.data) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể lưu bài nộp." },
      { status: 500 }
    );
  }
}
