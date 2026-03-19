import { NextRequest, NextResponse } from "next/server";

import { fetchAssignmentById, verifyInstructorCourseOwnership } from "@/lib/assignment-route-utils";
import { normalizeAssignment } from "@/lib/assignment-presenters";
import { getCurrentUserId } from "@/lib/directus-fetch";

export async function GET(
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

    const studentIdFilter = request.nextUrl.searchParams.get("studentId")?.trim();
    const orderedSubmissions = [...assignment.submissions].sort((a, b) => {
      const aPending = !a.review || a.review.status !== "finalized";
      const bPending = !b.review || b.review.status !== "finalized";
      if (aPending !== bPending) return aPending ? -1 : 1;
      const aTime = Date.parse(a.submitted_at ?? "");
      const bTime = Date.parse(b.submitted_at ?? "");
      if (!Number.isFinite(aTime) || !Number.isFinite(bTime)) return 0;
      return bTime - aTime;
    });
    const visibleSubmissions = studentIdFilter
      ? orderedSubmissions.filter((submission) => submission.user?.id === studentIdFilter)
      : orderedSubmissions;

    const currentIndex = visibleSubmissions.findIndex((submission) => submission.id === submissionId);
    if (currentIndex === -1) {
      return NextResponse.json({ error: "Không tìm thấy bài nộp." }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        assignment: {
          id: assignment.id,
          title: assignment.title,
          instructions: assignment.instructions,
          due_at: assignment.due_at,
          max_score: assignment.max_score,
          status: assignment.status,
          lesson: assignment.lesson,
          rubric: assignment.rubric,
          counts: assignment.counts,
        },
        submission: visibleSubmissions[currentIndex],
        navigation: {
          previous_submission_id:
            currentIndex < visibleSubmissions.length - 1
              ? visibleSubmissions[currentIndex + 1].id
              : null,
          next_submission_id:
            currentIndex > 0 ? visibleSubmissions[currentIndex - 1].id : null,
          total_visible: visibleSubmissions.length,
          current_position: currentIndex + 1,
          student_filter: studentIdFilter ?? null,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể tải workspace review." },
      { status: 500 }
    );
  }
}
