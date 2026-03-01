import { NextRequest, NextResponse } from "next/server";
import { directusFetch, getCurrentUserId } from "@/lib/directus-fetch";

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
    const { id: courseId } = await params;

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Chưa xác thực." },
        { status: 401 }
      );
    }

    const isOwner = await verifyOwnership(userId, courseId);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Không có quyền truy cập." },
        { status: 403 }
      );
    }

    const res = await directusFetch(
      `/items/modules?filter[course_id][_eq]=${courseId}&fields=*,lessons.id,lessons.title,lessons.slug,lessons.sort,lessons.type,lessons.duration,lessons.status,lessons.is_free,lessons.quizzes.id&sort=sort`
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Không thể tải danh sách module." },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Sort lessons within each module
    const modules = (data.data ?? []).map(
      (mod: { lessons?: { sort: number }[] }) => ({
        ...mod,
        lessons: (mod.lessons ?? []).sort(
          (a: { sort: number }, b: { sort: number }) => a.sort - b.sort
        ),
      })
    );

    return NextResponse.json({ data: modules });
  } catch (error) {
    console.error("GET modules error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Chưa xác thực." },
        { status: 401 }
      );
    }

    const isOwner = await verifyOwnership(userId, courseId);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Không có quyền truy cập." },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Get max sort value
    const sortRes = await directusFetch(
      `/items/modules?filter[course_id][_eq]=${courseId}&aggregate[max]=sort`
    );

    let maxSort = 0;
    if (sortRes.ok) {
      const sortData = await sortRes.json();
      maxSort = sortData.data?.[0]?.max?.sort ?? 0;
    }

    const res = await directusFetch(`/items/modules`, {
      method: "POST",
      body: JSON.stringify({
        title: body.title,
        description: body.description || null,
        course_id: courseId,
        sort: maxSort + 1,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      const message =
        errorData?.errors?.[0]?.message || "Không thể tạo module.";
      return NextResponse.json({ error: message }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ data: data.data }, { status: 201 });
  } catch (error) {
    console.error("POST modules error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
  }
}
