import { NextRequest, NextResponse } from "next/server";

import { getAiUserContext } from "@/lib/ai-auth";
import { postAiApiRaw } from "@/lib/ai-client";
import {
  mentorRecommendationDismissRequestSchema,
  statusResponseSchema,
} from "@/lib/ai-schemas";

export async function POST(request: NextRequest) {
  try {
    const user = await getAiUserContext();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsedBody = mentorRecommendationDismissRequestSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid recommendation payload" }, { status: 400 });
    }

    const raw = await postAiApiRaw("/v1/mentor/recommendation-dismiss", {
      user_id: user.userId,
      recommendation_id: parsedBody.data.recommendation_id,
      reason: parsedBody.data.reason ?? null,
    });

    const parsed = statusResponseSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "AI recommendation response schema validation failed" },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed.data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI recommendation dismiss error" },
      { status: 500 }
    );
  }
}
