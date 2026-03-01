import { directusFetch } from "@/lib/directus-fetch";
import { NextRequest, NextResponse } from "next/server";
import { notifyInstructorCourseStatus } from "@/lib/notifications-helper";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const res = await directusFetch(
      `/items/courses/${id}?fields=*,category_id.id,category_id.name,instructors.user_id.id,instructors.user_id.first_name,instructors.user_id.last_name,instructors.user_id.email,instructors.user_id.avatar,modules.id,modules.title,modules.sort,modules.lessons.id,modules.lessons.title,modules.lessons.type,modules.lessons.duration,modules.lessons.is_free,modules.lessons.sort,modules.lessons.status,modules.lessons.content,reviews.id,reviews.rating,reviews.comment,reviews.status,reviews.date_created,reviews.user_id.first_name,reviews.user_id.last_name`
    );

    if (res.status === 401) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: "Không thể tải thông tin khoá học" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.status !== undefined) {
      updateData.status = body.status;
    }

    if (body.is_featured !== undefined) {
      updateData.is_featured = body.is_featured;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Không có dữ liệu cập nhật" },
        { status: 400 }
      );
    }

    const res = await directusFetch(`/items/courses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updateData),
    });

    if (res.status === 401) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 }
      );
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: "Không thể cập nhật khoá học", details: error },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Notify instructor about course status change
    if (body.status === "published" || body.status === "archived") {
      try {
        const courseRes = await directusFetch(
          `/items/courses/${id}?fields=title,instructors.user_id`
        );
        if (courseRes.ok) {
          const courseData = await courseRes.json();
          const course = courseData.data;
          const approved = body.status === "published";
          for (const inst of course.instructors ?? []) {
            const instructorId = typeof inst.user_id === "string" ? inst.user_id : inst.user_id?.id;
            if (instructorId) {
              notifyInstructorCourseStatus(instructorId, course.title, approved, id).catch(() => {});
            }
          }
        }
      } catch {
        // Non-critical
      }
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
