import { NextRequest, NextResponse } from "next/server";

import { ensureEnrollment, getAiUserContext } from "@/lib/ai-auth";
import { callAiApiWithMeta } from "@/lib/ai-client";
import { assistantResponseSchema } from "@/lib/ai-schemas";

function normalizeMode(value: unknown): "auto" | "helpdesk" | "references" {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "helpdesk" || normalized === "references") {
    return normalized;
  }
  return "auto";
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAiUserContext();
    if (!user) {
      return NextResponse.json({ error: "Bạn cần đăng nhập để dùng Trợ lý AI." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const query = String(body?.query ?? "").trim();
    const courseId = body?.course_id ? String(body.course_id) : null;
    const mode = normalizeMode(body?.mode);

    if (!query) {
      return NextResponse.json({ error: "Thiếu nội dung cần gửi cho Trợ lý AI." }, { status: 400 });
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
      "/v1/assistant/chat",
      {
        mode,
        user_id: user.userId,
        role: user.role,
        query,
        course_id: courseId,
        context: {
          current_path: body?.current_path ? String(body.current_path) : undefined,
          level: body?.level ? String(body.level) : undefined,
        },
      },
      assistantResponseSchema
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
      { error: error instanceof Error ? error.message : "Trợ lý AI chưa thể xử lý yêu cầu này." },
      { status: 500 }
    );
  }
}
