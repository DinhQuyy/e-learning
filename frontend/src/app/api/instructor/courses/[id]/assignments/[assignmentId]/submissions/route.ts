import { NextRequest, NextResponse } from "next/server";

import { fetchAssignmentById, verifyInstructorCourseOwnership } from "@/lib/assignment-route-utils";
import { normalizeAssignment } from "@/lib/assignment-presenters";
import { getCurrentUserId } from "@/lib/directus-fetch";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  try {
    const { id: courseId, assignmentId } = await params;
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }
    const isOwner = await verifyInstructorCourseOwnership(userId, courseId);
    if (!isOwner) {
      return NextResponse.json({ error: "Không có quyền truy cập." }, { status: 403 });
    }

    const row = await fetchAssignmentById(assignmentId);
    const normalized = normalizeAssignment(row);
    if (!normalized) {
      return NextResponse.json({ error: "Không tìm thấy assignment." }, { status: 404 });
    }

    const studentId = request.nextUrl.searchParams.get("studentId")?.trim();
    const status = request.nextUrl.searchParams.get("status")?.trim();

    let submissions = normalized.submissions;
    if (studentId) {
      submissions = submissions.filter((submission) => submission.user?.id === studentId);
    }
    if (status === "needs_review") {
      submissions = submissions.filter(
        (submission) => !submission.review || submission.review.status !== "finalized"
      );
    }
    if (status === "reviewed") {
      submissions = submissions.filter(
        (submission) => submission.review?.status === "finalized"
      );
    }

    submissions = submissions.sort((a, b) => {
      const aTime = Date.parse(a.submitted_at ?? "");
      const bTime = Date.parse(b.submitted_at ?? "");
      if (!Number.isFinite(aTime) || !Number.isFinite(bTime)) return 0;
      return bTime - aTime;
    });

    return NextResponse.json({
      data: submissions,
      meta: {
        assignment: {
          id: normalized.id,
          title: normalized.title,
          lesson: normalized.lesson,
          counts: normalized.counts,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể tải danh sách bài nộp." },
      { status: 500 }
    );
  }
}
