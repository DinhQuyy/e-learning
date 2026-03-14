import { NextRequest, NextResponse } from "next/server";

import { getAiUserContext } from "@/lib/ai-auth";
import { callAiApiRaw } from "@/lib/ai-client";
import { referencesSuggestionsResponseSchema } from "@/lib/ai-schemas";

export async function GET(request: NextRequest) {
  try {
    if (!(await getAiUserContext())) {
      return NextResponse.json({ error: "Bạn cần đăng nhập để dùng Trợ lý AI." }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const q = String(searchParams.get("q") ?? "").trim();
    const limitRaw = Number(searchParams.get("limit") ?? "8");
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), 25) : 8;

    const aiParams = new URLSearchParams({
      q,
      limit: String(limit),
    });

    const raw = await callAiApiRaw(`/v1/references/suggestions?${aiParams.toString()}`);
    const parsed = referencesSuggestionsResponseSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dữ liệu gợi ý tài liệu từ Trợ lý AI không hợp lệ." }, { status: 502 });
    }

    return NextResponse.json(parsed.data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể lấy gợi ý tài liệu từ Trợ lý AI." },
      { status: 500 }
    );
  }
}
