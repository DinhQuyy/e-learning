import { NextRequest, NextResponse } from "next/server";

import { getAiUserContext } from "@/lib/ai-auth";
import { directusAdminFetch } from "@/lib/directus-admin";

const ALLOWED_EVENT_NAMES = new Set([
  "chat_open",
  "restricted_chat_open",
  "message_send",
  "feedback_helpful",
  "feedback_not_helpful",
  "starter_prompt_click",
  "restricted_allowed_prompt_click",
  "restricted_prompt_blocked",
  "restricted_banner_impression",
  "coach_cta_click",
  "lesson_study_refresh",
  "continue_in_chat",
  "lesson_reference_open",
  "lesson_reference_filter_change",
  "lesson_reference_click",
  "mistake_review_load",
  "mistake_review_cta_click",
]);

const BLOCKED_PAYLOAD_KEYS = new Set([
  "message",
  "answer",
  "content",
  "body",
  "body_text",
  "submission_body",
  "lesson_body",
  "prompt",
  "raw_text",
  "text",
]);

function sanitizePayload(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const output: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (BLOCKED_PAYLOAD_KEYS.has(key)) continue;

    if (
      raw === null ||
      typeof raw === "string" ||
      typeof raw === "number" ||
      typeof raw === "boolean"
    ) {
      output[key] = raw;
      continue;
    }

    if (Array.isArray(raw)) {
      output[key] = raw
        .filter(
          (item) =>
            item === null ||
            typeof item === "string" ||
            typeof item === "number" ||
            typeof item === "boolean"
        )
        .slice(0, 20);
      continue;
    }

    if (typeof raw === "object") {
      output[key] = sanitizePayload(raw);
    }
  }

  return output;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const eventName = String(body?.event_name ?? "").trim();
    if (!ALLOWED_EVENT_NAMES.has(eventName)) {
      return NextResponse.json({ error: "Sự kiện AI không hợp lệ." }, { status: 400 });
    }

    const user = await getAiUserContext().catch(() => null);
    const surface = body?.surface ? String(body.surface).trim() : null;
    const currentPath = body?.current_path ? String(body.current_path).trim() : null;
    const payloadJson = sanitizePayload(body?.payload);

    const response = await directusAdminFetch("/items/ai_event_logs", {
      method: "POST",
      body: JSON.stringify({
        event_name: eventName,
        surface: surface || null,
        role: user?.role ?? null,
        current_path: currentPath || null,
        payload_json: payloadJson,
        created_at: new Date().toISOString(),
        user_id: user?.userId ?? null,
      }),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);
      return NextResponse.json(
        { error: errorPayload?.errors?.[0]?.message ?? "Không thể lưu AI event." },
        { status: 500 }
      );
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể ghi nhận AI event." },
      { status: 500 }
    );
  }
}
