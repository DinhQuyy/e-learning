import { NextRequest, NextResponse } from "next/server";

import { ensureEnrollment, getAiUserContext } from "@/lib/ai-auth";
import { callAiApiRaw } from "@/lib/ai-client";
import { assistantSuggestionsResponseSchema } from "@/lib/ai-schemas";

function normalizeMode(value: string | null): "auto" | "helpdesk" | "references" {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "helpdesk" || normalized === "references") {
    return normalized;
  }
  return "auto";
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAiUserContext();
    if (!user) {
      return NextResponse.json({ error: "Bạn cần đăng nhập để dùng Trợ lý AI." }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const q = String(searchParams.get("q") ?? "").trim();
    const courseIdRaw = String(searchParams.get("course_id") ?? "").trim();
    const courseId = courseIdRaw.length > 0 ? courseIdRaw : null;
    const mode = normalizeMode(searchParams.get("mode"));
    const limitRaw = Number(searchParams.get("limit") ?? "10");
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), 25) : 10;

    if (courseId && user.role === "student") {
      const enrolled = await ensureEnrollment(user.userId, courseId);
      if (!enrolled) {
        return NextResponse.json(
          { error: "Bạn cần đăng ký khóa học để nhận gợi ý trong phạm vi khóa này." },
          { status: 403 }
        );
      }
    }

    const aiParams = new URLSearchParams({
      role: user.role,
      q,
      mode,
      limit: String(limit),
    });
    if (courseId) {
      aiParams.set("course_id", courseId);
    }

    const raw = await callAiApiRaw(`/v1/assistant/suggestions?${aiParams.toString()}`);
    const parsed = assistantSuggestionsResponseSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dữ liệu gợi ý từ Trợ lý AI không hợp lệ." }, { status: 502 });
    }

    return NextResponse.json(parsed.data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể lấy gợi ý từ Trợ lý AI." },
      { status: 500 }
    );
  }
}
