import { NextRequest, NextResponse } from "next/server";

import { callAiApi } from "@/lib/ai-client";
import { instructorReviewCopilotResponseSchema } from "@/lib/ai-schemas";
import { fetchAssignmentById, verifyInstructorCourseOwnership } from "@/lib/assignment-route-utils";
import { normalizeAssignment } from "@/lib/assignment-presenters";
import { directusAdminFetch } from "@/lib/directus-admin";
import { directusFetch, getCurrentUserId, getDirectusError } from "@/lib/directus-fetch";
import { getAiUserContext } from "@/lib/ai-auth";

export async function POST(request: NextRequest) {
  try {
    const user = await getAiUserContext();
    const directusUserId = await getCurrentUserId();
    if (!user || !directusUserId || user.role !== "instructor") {
      return NextResponse.json({ error: "Chỉ giảng viên mới dùng được copilot chấm bài." }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const courseId = String(body?.course_id ?? "").trim();
    const assignmentId = String(body?.assignment_id ?? "").trim();
    const submissionId = String(body?.submission_id ?? "").trim();
    if (!courseId || !assignmentId || !submissionId) {
      return NextResponse.json({ error: "Thiếu course_id, assignment_id hoặc submission_id." }, { status: 400 });
    }

    const isOwner = await verifyInstructorCourseOwnership(directusUserId, courseId);
    if (!isOwner) {
      return NextResponse.json({ error: "Không có quyền dùng copilot cho khóa học này." }, { status: 403 });
    }

    const assignment = normalizeAssignment(await fetchAssignmentById(assignmentId));
    if (!assignment) {
      return NextResponse.json({ error: "Không tìm thấy assignment." }, { status: 404 });
    }
    const submission = assignment.submissions.find((item) => item.id === submissionId);
    if (!submission) {
      return NextResponse.json({ error: "Không tìm thấy bài nộp." }, { status: 404 });
    }

    const lessonRes = await directusFetch(
      `/items/lessons/${encodeURIComponent(
        assignment.lesson.id
      )}?fields=id,title,content,module_id.course_id.id,module_id.course_id.title`
    );
    if (!lessonRes.ok) {
      return NextResponse.json(
        { error: await getDirectusError(lessonRes, "Không thể tải ngữ cảnh lesson.") },
        { status: lessonRes.status }
      );
    }
    const lessonPayload = await lessonRes.json().catch(() => null);
    const lesson = lessonPayload?.data;
    const lessonContent = String(lesson?.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const lessonContentSummary = lessonContent.slice(0, 2400);

    const aiData = await callAiApi(
      "/v1/instructor-review-copilot",
      {
        user_id: user.userId,
        role: user.role,
        course_title: String(lesson?.module_id?.course_id?.title ?? ""),
        lesson_title: assignment.lesson.title,
        assignment_title: assignment.title,
        assignment_instructions: assignment.instructions,
        lesson_content_summary: lessonContentSummary || undefined,
        submission_body: submission.body_text,
        submission_reference_url: submission.reference_url || undefined,
        rubric_criteria: assignment.rubric.criteria.map((criterion) => ({
          criterion_id: criterion.id,
          title: criterion.title,
          description: criterion.description || undefined,
          max_points: criterion.max_points,
          scoring_guidance: criterion.scoring_guidance || undefined,
        })),
      },
      instructorReviewCopilotResponseSchema
    );

    const artifactRes = await directusAdminFetch("/items/ai_review_artifacts", {
      method: "POST",
      body: JSON.stringify({
        submission_id: submissionId,
        model: process.env.OPENAI_MODEL || process.env.AI_OPENAI_MODEL || "gpt-5.4-mini",
        prompt_version: "instructor-review-copilot-v1",
        payload: aiData,
        applied_state: "pending",
      }),
    });
    if (!artifactRes.ok) {
      return NextResponse.json(
        { error: await getDirectusError(artifactRes, "Không thể lưu bản ghi gợi ý AI.") },
        { status: artifactRes.status }
      );
    }
    const artifactPayload = await artifactRes.json().catch(() => null);

    return NextResponse.json({
      data: aiData,
      meta: {
        artifact_id: artifactPayload?.data?.id ? String(artifactPayload.data.id) : null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể tạo gợi ý AI." },
      { status: 500 }
    );
  }
}
