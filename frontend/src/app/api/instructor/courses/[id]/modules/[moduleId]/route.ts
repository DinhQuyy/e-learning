import { NextRequest, NextResponse } from "next/server";

import { enqueueDeleteIndex, enqueueModuleIndex } from "@/lib/ai-indexing";
import { directusFetch, getCurrentUserId } from "@/lib/directus-fetch";

async function verifyOwnership(userId: string, courseId: string): Promise<boolean> {
  const res = await directusFetch(
    `/items/courses_instructors?filter[course_id][_eq]=${courseId}&filter[user_id][_eq]=${userId}&limit=1`
  );
  if (!res.ok) return false;
  const data = await res.json();
  return (data.data?.length ?? 0) > 0;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string }> }
) {
  try {
    const { id: courseId, moduleId } = await params;

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Chua xac thuc." }, { status: 401 });
    }

    const isOwner = await verifyOwnership(userId, courseId);
    if (!isOwner) {
      return NextResponse.json({ error: "Khong co quyen truy cap." }, { status: 403 });
    }

    const body = await request.json();

    const res = await directusFetch(`/items/modules/${moduleId}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: body.title,
        description: body.description ?? null,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      const message = errorData?.errors?.[0]?.message || "Khong the cap nhat module.";
      return NextResponse.json({ error: message }, { status: res.status });
    }

    const data = await res.json();

    await enqueueModuleIndex({
      moduleId,
      title: String(data.data?.title ?? body.title ?? "Module"),
      description: String(data.data?.description ?? body.description ?? ""),
      courseId,
    });

    return NextResponse.json({ data: data.data });
  } catch (error) {
    console.error("PATCH module error:", error);
    return NextResponse.json({ error: "Loi he thong." }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string }> }
) {
  try {
    const { id: courseId, moduleId } = await params;

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Chua xac thuc." }, { status: 401 });
    }

    const isOwner = await verifyOwnership(userId, courseId);
    if (!isOwner) {
      return NextResponse.json({ error: "Khong co quyen truy cap." }, { status: 403 });
    }

    const lessonsRes = await directusFetch(
      `/items/lessons?filter[module_id][_eq]=${moduleId}&fields=id`
    );

    if (lessonsRes.ok) {
      const lessonsData = await lessonsRes.json();
      for (const lesson of lessonsData.data ?? []) {
        await directusFetch(`/items/lessons/${lesson.id}`, {
          method: "DELETE",
        });
        await enqueueDeleteIndex("course_lesson", String(lesson.id));
      }
    }

    const res = await directusFetch(`/items/modules/${moduleId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Khong the xoa module." }, { status: res.status });
    }

    await enqueueDeleteIndex("course_module", moduleId);

    return NextResponse.json({ message: "Da xoa module thanh cong." });
  } catch (error) {
    console.error("DELETE module error:", error);
    return NextResponse.json({ error: "Loi he thong." }, { status: 500 });
  }
}