import { NextRequest, NextResponse } from "next/server";

import { getAiUserContext } from "@/lib/ai-auth";
import { callAiApi } from "@/lib/ai-client";
import { quizMistakeReviewResponseSchema } from "@/lib/ai-schemas";

export async function POST(request: NextRequest) {
  try {
    const user = await getAiUserContext();
    if (!user) {
      return NextResponse.json({ error: "Bạn cần đăng nhập để dùng Trợ lý AI." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const quizId = String(body?.quiz_id ?? "").trim();
    const attemptId = String(body?.attempt_id ?? "").trim();
    if (!quizId || !attemptId) {
      return NextResponse.json({ error: "Thiếu quiz_id hoặc attempt_id." }, { status: 400 });
    }

    const data = await callAiApi(
      "/v1/quiz-mistake-review",
      {
        user_id: user.userId,
        role: user.role,
        quiz_id: quizId,
        attempt_id: attemptId,
        lesson_id: body?.lesson_id ? String(body.lesson_id) : undefined,
        current_path: body?.current_path ? String(body.current_path) : undefined,
      },
      quizMistakeReviewResponseSchema
    );

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể tải Phân tích lỗi AI." },
      { status: 500 }
    );
  }
}
