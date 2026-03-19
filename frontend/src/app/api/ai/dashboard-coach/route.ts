import { NextResponse } from "next/server";

import { getAiUserContext } from "@/lib/ai-auth";
import { callAiApiGet } from "@/lib/ai-client";
import { dashboardCoachResponseSchema } from "@/lib/ai-schemas";

export async function GET() {
  try {
    const user = await getAiUserContext();
    if (!user) {
      return NextResponse.json({ error: "Bạn cần đăng nhập để dùng Trợ lý AI." }, { status: 401 });
    }

    const data = await callAiApiGet(
      "/v1/dashboard-coach",
      {
        user_id: user.userId,
        role: user.role,
      },
      dashboardCoachResponseSchema
    );

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể tải Huấn luyện viên học tập AI." },
      { status: 500 }
    );
  }
}
