import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAiUserContext } from "@/lib/ai-auth";
import { postAiApiRaw } from "@/lib/ai-client";

const requeueRequestSchema = z.object({
  source_type: z.string().trim().min(1).max(80).optional(),
  course_id: z.string().trim().min(1).max(80).optional(),
  pending_only: z.boolean().optional(),
  limit: z.number().int().min(1).max(500).optional(),
});

const requeueResponseSchema = z.object({
  status: z.literal("ok"),
  queued: z.number(),
  queue_depth: z.number(),
  document_ids: z.array(z.string()),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getAiUserContext();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const parsedBody = requeueRequestSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid requeue payload" }, { status: 400 });
    }

    const payload = {
      source_type: parsedBody.data.source_type ?? null,
      course_id: parsedBody.data.course_id ?? null,
      pending_only: parsedBody.data.pending_only ?? true,
      limit: parsedBody.data.limit ?? 100,
    };

    const raw = await postAiApiRaw("/v1/admin/indexing/requeue", payload);
    const parsedResponse = requeueResponseSchema.safeParse(raw);
    if (!parsedResponse.success) {
      return NextResponse.json(
        { error: "Unexpected AI requeue response format" },
        { status: 502 }
      );
    }

    return NextResponse.json(parsedResponse.data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI requeue error" },
      { status: 500 }
    );
  }
}

