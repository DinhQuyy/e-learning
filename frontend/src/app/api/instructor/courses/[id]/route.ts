import { NextRequest, NextResponse } from "next/server";
import { directusFetch, getCurrentUserId } from "@/lib/directus-fetch";
import { extractFileIdFromUrl } from "@/lib/directus";

const INSTRUCTOR_COURSE_FIELDS = [
  "id",
  "title",
  "slug",
  "description",
  "content",
  "thumbnail",
  "level",
  "language",
  "promo_video_url",
  "price",
  "discount_price",
  "requirements",
  "what_you_learn",
  "target_audience",
  "status",
  "date_created",
  "date_updated",
  "category_id.id",
  "category_id.name",
  "modules.id",
  "modules.title",
  "modules.sort",
  "modules.lessons.id",
  "modules.lessons.title",
  "modules.lessons.sort",
  "modules.lessons.type",
  "modules.lessons.duration",
  "modules.lessons.status",
].join(",");

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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Không thể xác định người dùng." },
        { status: 401 }
      );
    }

    const isOwner = await verifyOwnership(userId, id);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Bạn không có quyền truy cập khoá học này." },
        { status: 403 }
      );
    }

    const res = await directusFetch(`/items/courses/${id}?fields=${INSTRUCTOR_COURSE_FIELDS}`);

    if (!res.ok) {
      return NextResponse.json(
        { error: "Không tìm thấy khoá học." },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ data: data.data });
  } catch (error) {
    console.error("GET /api/instructor/courses/[id] error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Không thể xác định người dùng." },
        { status: 401 }
      );
    }

    const isOwner = await verifyOwnership(userId, id);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Bạn không có quyền chỉnh sửa khoá học này." },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Sanitize body fields
    if (body.thumbnail) {
      body.thumbnail = extractFileIdFromUrl(body.thumbnail);
    }
    if (body.promo_video_url) {
      body.promo_video_url = extractFileIdFromUrl(body.promo_video_url);
    }

    const res = await directusFetch(`/items/courses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      const message =
        errorData?.errors?.[0]?.message || "Không thể cập nhật khoá học.";
      return NextResponse.json({ error: message }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ data: data.data });
  } catch (error) {
    console.error("PATCH /api/instructor/courses/[id] error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Không thể xác định người dùng." },
        { status: 401 }
      );
    }

    const isOwner = await verifyOwnership(userId, id);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Bạn không có quyền xoá khoá học này." },
        { status: 403 }
      );
    }

    // Check if course has enrollments
    const enrollmentRes = await directusFetch(
      `/items/enrollments?filter[course_id][_eq]=${id}&aggregate[count]=id`
    );

    if (enrollmentRes.ok) {
      const enrollmentData = await enrollmentRes.json();
      const enrollmentCount = enrollmentData.data?.[0]?.count?.id ?? 0;
      if (enrollmentCount > 0) {
        return NextResponse.json(
          {
            error:
              "Không thể xoá khoá học đã có học viên đăng ký. Hãy chuyển sang trạng thái lưu trữ.",
          },
          { status: 400 }
        );
      }
    }

    // Check course status
    const courseRes = await directusFetch(
      `/items/courses/${id}?fields=status`
    );

    if (courseRes.ok) {
      const courseData = await courseRes.json();
      if (
        courseData.data?.status === "published" ||
        courseData.data?.status === "archived"
      ) {
        return NextResponse.json(
          {
            error:
              "Chỉ có thể xoá khoá học ở trạng thái bản nháp hoặc chờ duyệt.",
          },
          { status: 400 }
        );
      }
    }

    // Delete junction record first
    const junctionRes = await directusFetch(
      `/items/courses_instructors?filter[course_id][_eq]=${id}&filter[user_id][_eq]=${userId}`
    );

    if (junctionRes.ok) {
      const junctionData = await junctionRes.json();
      for (const junction of junctionData.data ?? []) {
        await directusFetch(
          `/items/courses_instructors/${junction.id}`,
          {
            method: "DELETE",
          }
        );
      }
    }

    // Delete the course
    const deleteRes = await directusFetch(`/items/courses/${id}`, {
      method: "DELETE",
    });

    if (!deleteRes.ok) {
      return NextResponse.json(
        { error: "Không thể xoá khoá học." },
        { status: deleteRes.status }
      );
    }

    return NextResponse.json({ message: "Đã xoá khoá học thành công." });
  } catch (error) {
    console.error("DELETE /api/instructor/courses/[id] error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
  }
}
