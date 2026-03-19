import { NextRequest, NextResponse } from "next/server";

import { getAiUserContext } from "@/lib/ai-auth";
import { callAiApi } from "@/lib/ai-client";
import { courseAdvisorResponseSchema } from "@/lib/ai-schemas";

export async function POST(request: NextRequest) {
  try {
    const user = await getAiUserContext();
    const body = await request.json().catch(() => null);
    const courseId = String(body?.course_id ?? "").trim();

    if (!courseId) {
      return NextResponse.json({ error: "Thiếu mã khóa học." }, { status: 400 });
    }

    const aiUserId = user?.userId ?? `public-course-${courseId}`;
    const role = user?.role ?? "student";

    const data = await callAiApi(
      "/v1/course-advisor",
      {
        user_id: aiUserId,
        role,
        course_id: courseId,
        current_path: body?.current_path ? String(body.current_path) : undefined,
      },
      courseAdvisorResponseSchema
    );

    return NextResponse.json({
      data,
      meta: {
        viewer_signed_in: Boolean(user),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể tải Cố vấn khóa học AI." },
      { status: 500 }
    );
  }
}
