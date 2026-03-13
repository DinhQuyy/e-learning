import { NextRequest, NextResponse } from "next/server";

import { ensureEnrollment, getAiUserContext } from "@/lib/ai-auth";
import { callAiApiWithMeta } from "@/lib/ai-client";
import { helpdeskResponseSchema } from "@/lib/ai-schemas";

export async function POST(request: NextRequest) {
  try {
    const user = await getAiUserContext();
    if (!user) {
      return NextResponse.json({ error: "Bạn cần đăng nhập để dùng Trợ lý AI." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const query = String(body?.query ?? "").trim();
    const courseId = body?.course_id ? String(body.course_id) : null;

    if (!query) {
      return NextResponse.json({ error: "Thiếu nội dung cần hỏi." }, { status: 400 });
    }

    if (courseId && user.role === "student") {
      const enrolled = await ensureEnrollment(user.userId, courseId);
      if (!enrolled) {
        return NextResponse.json(
          { error: "Bạn cần đăng ký khóa học để dùng Trợ lý AI trong phạm vi khóa này." },
          { status: 403 }
        );
      }
    }

    const result = await callAiApiWithMeta(
      "/v1/chat",
      {
        mode: "helpdesk",
        user_id: user.userId,
        role: user.role,
        query,
        course_id: courseId,
        context: {
          current_path: body?.current_path ? String(body.current_path) : undefined,
        },
      },
      helpdeskResponseSchema
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
      { error: error instanceof Error ? error.message : "Trợ lý AI chưa thể xử lý yêu cầu hỗ trợ." },
      { status: 500 }
    );
  }
}
