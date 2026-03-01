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

export async function PATCH(
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
    const items: { id: number; sort: number }[] = body.items;

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ." },
        { status: 400 }
      );
    }

    // Update each module's sort value
    const updatePromises = items.map((item) =>
      directusFetch(`/items/modules/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ sort: item.sort }),
      })
    );

    await Promise.all(updatePromises);

    return NextResponse.json({ message: "Đã cập nhật thứ tự thành công." });
  } catch (error) {
    console.error("PATCH reorder modules error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
  }
}
