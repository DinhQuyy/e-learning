import { NextRequest, NextResponse } from "next/server";

import { getAiUserContext } from "@/lib/ai-auth";
import { callAiApiWithMeta } from "@/lib/ai-client";
import { chatResponseSchema } from "@/lib/ai-schemas";

export async function POST(request: NextRequest) {
  try {
    const user = await getAiUserContext();
    if (!user) {
      return NextResponse.json({ error: "Bạn cần đăng nhập để dùng Trợ lý AI." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const message = String(body?.message ?? "").trim();

    if (!message) {
      return NextResponse.json({ error: "Thiếu nội dung tin nhắn." }, { status: 400 });
    }

    const result = await callAiApiWithMeta(
      "/v1/chat",
      {
        user_id: user.userId,
        role: user.role,
        message,
        conversation_id: body?.conversation_id ? String(body.conversation_id) : undefined,
        course_id: body?.course_id ? String(body.course_id) : undefined,
        current_path: body?.current_path ? String(body.current_path) : undefined,
      },
      chatResponseSchema
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
