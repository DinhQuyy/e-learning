import { NextRequest, NextResponse } from "next/server";

import { directusFetch, getCurrentUserId } from "@/lib/directus-fetch";

const LESSON_DETAIL_FIELDS = [
  "id",
  "title",
  "slug",
  "type",
  "content",
  "video_url",
  "duration",
  "sort",
  "is_free",
  "status",
  "date_created",
  "module_id.id",
  "module_id.title",
].join(",");

async function verifyOwnership(userId: string, courseId: string): Promise<boolean> {
  const res = await directusFetch(
    `/items/courses_instructors?filter[course_id][_eq]=${courseId}&filter[user_id][_eq]=${userId}&limit=1`
  );
  if (!res.ok) return false;
  const data = await res.json();
  return (data.data?.length ?? 0) > 0;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string }> }
) {
  try {
    const { id: courseId, lessonId } = await params;

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Không thể xác định người dùng." }, { status: 401 });
    }

    const isOwner = await verifyOwnership(userId, courseId);
    if (!isOwner) {
      return NextResponse.json({ error: "Không có quyền truy cập." }, { status: 403 });
    }

    const res = await directusFetch(`/items/lessons/${lessonId}?fields=${LESSON_DETAIL_FIELDS}`);

    if (!res.ok) {
      return NextResponse.json({ error: "Không tìm thấy bài học." }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ data: data.data });
  } catch (error) {
    console.error("GET lesson error:", error);
    return NextResponse.json({ error: "Loi he thong." }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string }> }
) {
  try {
    const { id: courseId, lessonId } = await params;

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Không thể xác định người dùng." }, { status: 401 });
    }

    const isOwner = await verifyOwnership(userId, courseId);
    if (!isOwner) {
      return NextResponse.json({ error: "Không có quyền truy cập." }, { status: 403 });
    }

    const body = await request.json();

    const res = await directusFetch(`/items/lessons/${lessonId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      const message = errorData?.errors?.[0]?.message || "Không thể cập nhật bài học.";
      return NextResponse.json({ error: message }, { status: res.status });
    }

    const data = await res.json();

    return NextResponse.json({ data: data.data });
  } catch (error) {
    console.error("PATCH lesson error:", error);
    return NextResponse.json({ error: "Loi he thong." }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string }> }
) {
  try {
    const { id: courseId, lessonId } = await params;

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Không thể xác định người dùng." }, { status: 401 });
    }

    const isOwner = await verifyOwnership(userId, courseId);
    if (!isOwner) {
      return NextResponse.json({ error: "Không có quyền truy cập." }, { status: 403 });
    }

    const res = await directusFetch(`/items/lessons/${lessonId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Không thể xoá bài học." }, { status: res.status });
    }

    return NextResponse.json({ message: "Da xoa bai hoc thanh cong." });
  } catch (error) {
    console.error("DELETE lesson error:", error);
    return NextResponse.json({ error: "Loi he thong." }, { status: 500 });
  }
}
