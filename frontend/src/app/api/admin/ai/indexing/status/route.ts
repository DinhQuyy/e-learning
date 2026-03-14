import { NextResponse } from "next/server";
import { z } from "zod";

import { getAiUserContext } from "@/lib/ai-auth";
import { callAiApiRaw } from "@/lib/ai-client";

const indexingStatusSchema = z.object({
  queue_depth: z.number(),
  total_documents: z.number(),
  indexed_documents: z.number(),
  pending_documents: z.number(),
  total_chunks: z.number(),
  oldest_pending_updated_at: z.string().nullable().optional(),
});

export async function GET() {
  try {
    const user = await getAiUserContext();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const raw = await callAiApiRaw("/v1/admin/indexing/status");
    const parsed = indexingStatusSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Unexpected AI indexing status format" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ...parsed.data,
      oldest_pending_updated_at: parsed.data.oldest_pending_updated_at ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI indexing status error" },
      { status: 500 }
    );
  }
}

