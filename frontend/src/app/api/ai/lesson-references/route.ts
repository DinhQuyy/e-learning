import { NextRequest, NextResponse } from "next/server";

import { getAiUserContext } from "@/lib/ai-auth";
import { callAiApiGet } from "@/lib/ai-client";
import { lessonReferencesResponseSchema } from "@/lib/ai-schemas";

export async function GET(request: NextRequest) {
  try {
    const user = await getAiUserContext();
    if (!user) {
      return NextResponse.json({ error: "Bạn cần đăng nhập để dùng Trợ lý AI." }, { status: 401 });
    }

    const lessonId = request.nextUrl.searchParams.get("lesson_id")?.trim() ?? "";
    const intent = request.nextUrl.searchParams.get("intent")?.trim() ?? "";
    if (!lessonId) {
      return NextResponse.json({ error: "Thiếu lesson_id." }, { status: 400 });
    }

    const data = await callAiApiGet(
      "/v1/lesson-references",
      {
        user_id: user.userId,
        role: user.role,
        lesson_id: lessonId,
        intent,
      },
      lessonReferencesResponseSchema
    );

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể tải tài liệu tham khảo AI." },
      { status: 500 }
    );
  }
}
