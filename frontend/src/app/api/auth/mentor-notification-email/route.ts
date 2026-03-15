import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUserId } from "@/lib/directus-fetch";
import { saveMentorNotificationEmailPreference } from "@/lib/mentor-email-preferences";

const requestSchema = z.object({
  notification_email: z.string().trim().max(255).optional().nullable(),
  enabled: z.boolean(),
});

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Chưa xác thực." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dữ liệu cài đặt email nhắc học không hợp lệ." },
        { status: 400 }
      );
    }

    const result = await saveMentorNotificationEmailPreference({
      userId,
      notificationEmail: parsed.data.notification_email ?? null,
      enabled: parsed.data.enabled,
    });

    return NextResponse.json({
      status: "ok",
      save_status: result.status,
      verification_sent: result.verificationSent,
      warning: "error" in result ? result.error : null,
      preference: result.preference,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Không thể lưu email nhận nhắc học.";

    const status = message.includes("không hợp lệ") ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
