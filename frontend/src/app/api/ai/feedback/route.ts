import { NextRequest, NextResponse } from "next/server";

import { getAiUserContext } from "@/lib/ai-auth";
import { postAiApiRaw } from "@/lib/ai-client";
import { aiFeedbackRequestSchema, aiFeedbackResponseSchema } from "@/lib/ai-schemas";

export async function POST(request: NextRequest) {
  try {
    const user = await getAiUserContext();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsedBody = aiFeedbackRequestSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid feedback payload" }, { status: 400 });
    }

    const payload = parsedBody.data;
    const raw = await postAiApiRaw("/v1/feedback", {
      user_id: user.userId,
      conversation_id: payload.conversation_id,
      message_id: payload.assistant_message_id,
      mode: payload.mode,
      rating: payload.rating,
      comment: payload.comment ?? null,
      include_in_training: payload.include_in_training ?? true,
    });

    const parsedResponse = aiFeedbackResponseSchema.safeParse(raw);
    if (!parsedResponse.success) {
      return NextResponse.json(
        { error: "AI feedback response schema validation failed" },
        { status: 500 }
      );
    }

    return NextResponse.json(parsedResponse.data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI feedback error" },
      { status: 500 }
    );
  }
}

