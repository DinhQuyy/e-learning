import { NextRequest, NextResponse } from "next/server";

import { ensureEnrollment, getAiUserContext } from "@/lib/ai-auth";
import { callAiApiWithMeta } from "@/lib/ai-client";
import { referencesResponseSchema } from "@/lib/ai-schemas";

export async function POST(request: NextRequest) {
  try {
    const user = await getAiUserContext();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const query = String(body?.query ?? "").trim();
    const courseId = body?.course_id ? String(body.course_id) : null;

    if (!query) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    if (courseId && user.role === "student") {
      const enrolled = await ensureEnrollment(user.userId, courseId);
      if (!enrolled) {
        return NextResponse.json({ error: "Enrollment required" }, { status: 403 });
      }
    }

    const result = await callAiApiWithMeta(
      "/v1/chat",
      {
        mode: "references",
        user_id: user.userId,
        role: user.role,
        query,
        course_id: courseId,
        context: {
          level: body?.level ? String(body.level) : undefined,
        },
      },
      referencesResponseSchema
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
      { error: error instanceof Error ? error.message : "AI references error" },
      { status: 500 }
    );
  }
}
