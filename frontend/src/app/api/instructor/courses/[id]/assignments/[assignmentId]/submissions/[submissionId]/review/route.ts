import { NextRequest, NextResponse } from "next/server";

import { fetchAssignmentById, normalizeCriterionScores, sumCriterionScores, verifyInstructorCourseOwnership } from "@/lib/assignment-route-utils";
import { normalizeAssignment } from "@/lib/assignment-presenters";
import { directusAdminFetch } from "@/lib/directus-admin";
import { getCurrentUserId, getDirectusError } from "@/lib/directus-fetch";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string; submissionId: string }> }
) {
  try {
    const { id: courseId, assignmentId, submissionId } = await params;
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }
    const isOwner = await verifyInstructorCourseOwnership(userId, courseId);
    if (!isOwner) {
      return NextResponse.json({ error: "Không có quyền truy cập." }, { status: 403 });
    }

    const assignment = normalizeAssignment(await fetchAssignmentById(assignmentId));
    if (!assignment) {
      return NextResponse.json({ error: "Không tìm thấy assignment." }, { status: 404 });
    }
    const submission = assignment.submissions.find((item) => item.id === submissionId);
    if (!submission) {
      return NextResponse.json({ error: "Không tìm thấy bài nộp." }, { status: 404 });
    }
    if (submission.review?.status === "finalized") {
      return NextResponse.json({ error: "Bài nộp này đã được finalize." }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const status = String(body?.status ?? "draft") === "finalized" ? "finalized" : "draft";
    const criterionScores = normalizeCriterionScores(body?.criterion_scores);
    const finalFeedback = String(body?.final_feedback ?? "").trim();
    const artifactId = body?.artifact_id ? String(body.artifact_id) : null;
    const artifactState =
      body?.artifact_state === "applied" || body?.artifact_state === "ignored"
        ? String(body.artifact_state)
        : null;

    if (criterionScores.length === 0) {
      return NextResponse.json({ error: "Thiếu criterion scores hợp lệ." }, { status: 400 });
    }

    const finalScore = sumCriterionScores(criterionScores);
    const existingReviewId = submission.review?.id || null;

    const reviewPayload = {
      submission_id: submissionId,
      reviewer_id: userId,
      status,
      final_score: finalScore,
      criterion_scores: criterionScores,
      final_feedback: finalFeedback || null,
    };

    const reviewRes = await directusAdminFetch(
      existingReviewId
        ? `/items/assignment_reviews/${encodeURIComponent(existingReviewId)}`
        : "/items/assignment_reviews",
      {
        method: existingReviewId ? "PATCH" : "POST",
        body: JSON.stringify(reviewPayload),
      }
    );
    if (!reviewRes.ok) {
      return NextResponse.json(
        { error: await getDirectusError(reviewRes, "Không thể lưu review.") },
        { status: reviewRes.status }
      );
    }
    const reviewPayloadResponse = await reviewRes.json().catch(() => null);

    const submissionRes = await directusAdminFetch(`/items/assignment_submissions/${encodeURIComponent(submissionId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: status === "finalized" ? "reviewed" : "submitted",
        reviewed_at: status === "finalized" ? new Date().toISOString() : null,
      }),
    });
    if (!submissionRes.ok) {
      return NextResponse.json(
        { error: await getDirectusError(submissionRes, "Không thể cập nhật trạng thái bài nộp.") },
        { status: submissionRes.status }
      );
    }

    if (artifactId && artifactState) {
      await directusAdminFetch(`/items/ai_review_artifacts/${encodeURIComponent(artifactId)}`, {
        method: "PATCH",
        body: JSON.stringify({ applied_state: artifactState }),
      });
    }

    return NextResponse.json({
      data: {
        id: String(reviewPayloadResponse?.data?.id ?? existingReviewId ?? ""),
        status,
        final_score: finalScore,
        criterion_scores: criterionScores,
        final_feedback: finalFeedback,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể lưu review." },
      { status: 500 }
    );
  }
}
