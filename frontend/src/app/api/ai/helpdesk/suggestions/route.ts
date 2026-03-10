import { NextRequest, NextResponse } from "next/server";

import { ensureEnrollment, getAiUserContext } from "@/lib/ai-auth";
import { callAiApiRaw } from "@/lib/ai-client";
import { helpdeskSuggestionsResponseSchema } from "@/lib/ai-schemas";

export async function GET(request: NextRequest) {
  try {
    const user = await getAiUserContext();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const q = String(searchParams.get("q") ?? "").trim();
    const courseIdRaw = String(searchParams.get("course_id") ?? "").trim();
    const courseId = courseIdRaw.length > 0 ? courseIdRaw : null;

    const limitRaw = Number(searchParams.get("limit") ?? "8");
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), 25) : 8;

    if (courseId && user.role === "student") {
      const enrolled = await ensureEnrollment(user.userId, courseId);
      if (!enrolled) {
        return NextResponse.json({ error: "Enrollment required" }, { status: 403 });
      }
    }

    const aiParams = new URLSearchParams({
      role: user.role,
      q,
      limit: String(limit),
    });
    if (courseId) {
      aiParams.set("course_id", courseId);
    }

    const raw = await callAiApiRaw(`/v1/helpdesk/suggestions?${aiParams.toString()}`);
    const parsed = helpdeskSuggestionsResponseSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid suggestions schema" }, { status: 502 });
    }

    return NextResponse.json(parsed.data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI suggestions error" },
      { status: 500 }
    );
  }
}
