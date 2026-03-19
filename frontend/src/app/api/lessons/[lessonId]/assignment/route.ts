import { NextRequest, NextResponse } from "next/server";

import {
  ASSIGNMENT_DETAIL_FIELDS,
  ensureStudentHasLessonAccess,
} from "@/lib/assignment-route-utils";
import { normalizeAssignment, normalizeSubmission } from "@/lib/assignment-presenters";
import { directusFetch, getCurrentUserId, getDirectusError } from "@/lib/directus-fetch";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await params;
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const access = await ensureStudentHasLessonAccess(userId, lessonId);
    if (!access) {
      return NextResponse.json({ error: "Bạn chưa ghi danh khóa học này." }, { status: 403 });
    }

    const assignmentRes = await directusFetch(
      `/items/assignments?filter[lesson_id][_eq]=${encodeURIComponent(
        lessonId
      )}&filter[status][_eq]=published&fields=${ASSIGNMENT_DETAIL_FIELDS}&sort=-date_created,-id&limit=1`
    );
    if (!assignmentRes.ok) {
      return NextResponse.json(
        { error: await getDirectusError(assignmentRes, "Không thể tải assignment.") },
        { status: assignmentRes.status }
      );
    }
    const assignmentPayload = await assignmentRes.json().catch(() => null);
    const assignmentRow = Array.isArray(assignmentPayload?.data) ? assignmentPayload.data[0] : null;
    if (!assignmentRow) {
      return NextResponse.json({ data: null });
    }

    const assignment = normalizeAssignment({
      ...assignmentRow,
      submissions: [],
    });
    const assignmentId = assignment?.id;
    if (!assignmentId) {
      return NextResponse.json({ data: null });
    }

    const submissionRes = await directusFetch(
      `/items/assignment_submissions?filter[assignment_id][_eq]=${encodeURIComponent(
        assignmentId
      )}&filter[user_id][_eq]=${encodeURIComponent(
        userId
      )}&fields=id,status,body_text,reference_url,submitted_at,reviewed_at,review.id,review.status,review.final_score,review.criterion_scores,review.final_feedback,review.reviewer_id.id,review.reviewer_id.first_name,review.reviewer_id.last_name&sort=-submitted_at,-date_created,-id&limit=1`
    );
    if (!submissionRes.ok) {
      return NextResponse.json(
        { error: await getDirectusError(submissionRes, "Không thể tải bài nộp.") },
        { status: submissionRes.status }
      );
    }
    const submissionPayload = await submissionRes.json().catch(() => null);
    const submissionRow = Array.isArray(submissionPayload?.data) ? submissionPayload.data[0] : null;

    return NextResponse.json({
      data: {
        assignment,
        submission: normalizeSubmission(submissionRow),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể tải assignment." },
      { status: 500 }
    );
  }
}
