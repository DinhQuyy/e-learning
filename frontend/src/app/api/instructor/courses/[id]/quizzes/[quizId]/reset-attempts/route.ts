import { NextRequest, NextResponse } from "next/server";
import { directusFetch, getCurrentUserId } from "@/lib/directus-fetch";
import { directusUrl } from "@/lib/directus";

interface ResetPayload {
  user_id?: string;
}

interface AttemptItem {
  id: string;
}

async function deleteAttemptWithServerToken(
  attemptId: string
): Promise<Response> {
  const staticToken = process.env.DIRECTUS_STATIC_TOKEN;

  // Preferred path: server token (bypasses instructor DELETE permission limits).
  if (staticToken) {
    const res = await fetch(`${directusUrl}/items/quiz_attempts/${attemptId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${staticToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    if (res.ok) return res;
  }

  // Fallback to current user token flow.
  return directusFetch(`/items/quiz_attempts/${attemptId}`, {
    method: "DELETE",
  });
}

async function verifyOwnership(
  userId: string,
  courseId: string
): Promise<boolean> {
  const res = await directusFetch(
    `/items/courses_instructors?filter[course_id][_eq]=${courseId}&filter[user_id][_eq]=${userId}&limit=1`
  );
  if (!res.ok) return false;
  const data = await res.json();
  return (data.data?.length ?? 0) > 0;
}

async function verifyQuizInCourse(
  courseId: string,
  quizId: string
): Promise<boolean> {
  const res = await directusFetch(
    `/items/quizzes?filter[id][_eq]=${quizId}&filter[lesson_id][module_id][course_id][_eq]=${courseId}&fields=id&limit=1`
  );
  if (!res.ok) return false;
  const data = await res.json();
  return (data.data?.length ?? 0) > 0;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; quizId: string }> }
) {
  try {
    const { id: courseId, quizId } = await params;

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Chưa xác thực." }, { status: 401 });
    }

    const isOwner = await verifyOwnership(userId, courseId);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Không có quyền truy cập." },
        { status: 403 }
      );
    }

    const isQuizInCourse = await verifyQuizInCourse(courseId, quizId);
    if (!isQuizInCourse) {
      return NextResponse.json(
        { error: "Không tìm thấy quiz trong khóa học này." },
        { status: 404 }
      );
    }

    const body = (await request.json().catch(() => null)) as ResetPayload | null;
    const targetUserId = body?.user_id?.trim();

    if (!targetUserId) {
      return NextResponse.json(
        { error: "Thiếu ID học viên cần reset." },
        { status: 400 }
      );
    }

    const attemptsRes = await directusFetch(
      `/items/quiz_attempts?filter[quiz_id][_eq]=${quizId}&filter[user_id][_eq]=${targetUserId}&fields=id&limit=-1`
    );

    if (!attemptsRes.ok) {
      return NextResponse.json(
        { error: "Không thể tải lượt làm quiz của học viên." },
        { status: attemptsRes.status }
      );
    }

    const attemptsData = await attemptsRes.json();
    const attempts: AttemptItem[] = attemptsData.data ?? [];

    if (attempts.length === 0) {
      return NextResponse.json({
        message: "Học viên chưa có lượt làm quiz để reset.",
        deleted_count: 0,
      });
    }

    const deleteResults = await Promise.all(
      attempts.map((attempt) => deleteAttemptWithServerToken(attempt.id))
    );

    const failedCount = deleteResults.filter((res) => !res.ok).length;
    if (failedCount > 0) {
      const statusList = deleteResults
        .filter((res) => !res.ok)
        .map((res) => res.status)
        .join(",");
      return NextResponse.json(
        {
          error: `Reset chưa hoàn tất. Xóa thành công ${attempts.length - failedCount}/${attempts.length} lượt.`,
          detail: `delete_statuses=${statusList || "unknown"}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Đã reset ${attempts.length} lượt làm quiz cho học viên.`,
      deleted_count: attempts.length,
    });
  } catch (error) {
    console.error("POST reset quiz attempts error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
  }
}
