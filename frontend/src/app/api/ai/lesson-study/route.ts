import { NextRequest, NextResponse } from "next/server";

import { getAiUserContext } from "@/lib/ai-auth";
import { callAiApi } from "@/lib/ai-client";
import { lessonStudyResponseSchema } from "@/lib/ai-schemas";

export async function POST(request: NextRequest) {
  try {
    const user = await getAiUserContext();
    if (!user) {
      return NextResponse.json({ error: "Bạn cần đăng nhập để dùng Trợ lý AI." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const lessonId = String(body?.lesson_id ?? "").trim();
    if (!lessonId) {
      return NextResponse.json({ error: "Thiếu lesson_id." }, { status: 400 });
    }

    const data = await callAiApi(
      "/v1/lesson-study",
      {
        user_id: user.userId,
        role: user.role,
        lesson_id: lessonId,
        current_path: body?.current_path ? String(body.current_path) : undefined,
        mode: body?.mode ? String(body.mode) : "default",
      },
      lessonStudyResponseSchema
    );

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể phân tích bài học này." },
      { status: 500 }
    );
  }
}
