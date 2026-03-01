import { NextRequest, NextResponse } from "next/server";
import { directusFetch, getCurrentUserId } from "@/lib/directus-fetch";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quizId } = await params;

    if (!quizId) {
      return NextResponse.json(
        { error: "ID quiz không hợp lệ" },
        { status: 400 }
      );
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    const res = await directusFetch(
      `/items/quiz_attempts?filter[quiz_id][_eq]=${quizId}&filter[user_id][_eq]=${userId}&sort=-date_created`
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Không thể tải lịch sử quiz" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ data: data.data ?? [] });
  } catch (error) {
    console.error("GET quiz attempts error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
