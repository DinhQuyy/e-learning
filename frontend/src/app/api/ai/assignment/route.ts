import { NextRequest, NextResponse } from "next/server";

import { ensureEnrollment, getAiUserContext } from "@/lib/ai-auth";
import { callAiApiWithMeta } from "@/lib/ai-client";
import { assignmentResponseSchema } from "@/lib/ai-schemas";

export async function POST(request: NextRequest) {
  try {
    const user = await getAiUserContext();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);

    const courseId = String(body?.course_id ?? "").trim();
    const question = String(body?.question ?? "").trim();
    const lessonId = body?.lesson_id ? String(body.lesson_id) : null;
    const quizId = body?.quiz_id ? String(body.quiz_id) : null;
    const studentAttempt = body?.student_attempt ? String(body.student_attempt) : null;

    if (!courseId || !question) {
      return NextResponse.json({ error: "Missing course_id or question" }, { status: 400 });
    }

    if (user.role === "student") {
      const enrolled = await ensureEnrollment(user.userId, courseId);
      if (!enrolled) {
        return NextResponse.json({ error: "Enrollment required" }, { status: 403 });
      }
    }

    const result = await callAiApiWithMeta(
      "/v1/assignment/hint",
      {
        user_id: user.userId,
        role: user.role,
        course_id: courseId,
        lesson_id: lessonId,
        quiz_id: quizId,
        question,
        student_attempt: studentAttempt,
      },
      assignmentResponseSchema
    );

    return NextResponse.json({
      data: result.data,
      meta: {
        conversation_id: result.conversationId,
        assistant_message_id: result.assistantMessageId,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI assignment error" },
      { status: 500 }
    );
  }
}
