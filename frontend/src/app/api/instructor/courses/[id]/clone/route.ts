import { NextRequest, NextResponse } from "next/server";
import { directusFetch, getCurrentUserId } from "@/lib/directus-fetch";

async function verifyOwnership(userId: string, courseId: string): Promise<boolean> {
  const res = await directusFetch(
    `/items/courses_instructors?filter[course_id][_eq]=${courseId}&filter[user_id][_eq]=${userId}&limit=1`
  );
  if (!res.ok) return false;
  const data = await res.json();
  return (data.data?.length ?? 0) > 0;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Không thể xác định người dùng." }, { status: 401 });
    }

    const isOwner = await verifyOwnership(userId, courseId);
    if (!isOwner) {
      return NextResponse.json({ error: "Bạn không có quyền nhân bản khoá học này." }, { status: 403 });
    }

    // Fetch original course with modules and lessons
    const courseRes = await directusFetch(
      `/items/courses/${courseId}?fields=title,description,thumbnail,price,discount_price,level,category_id,requirements,what_you_will_learn,target_audience,modules.id,modules.title,modules.sort,modules.lessons.id,modules.lessons.title,modules.lessons.type,modules.lessons.content,modules.lessons.video_url,modules.lessons.duration,modules.lessons.sort,modules.lessons.status`
    );

    if (!courseRes.ok) {
      return NextResponse.json({ error: "Không tìm thấy khoá học gốc." }, { status: 404 });
    }

    const original = (await courseRes.json()).data;

    // Create cloned course
    const slug = `${(original.title || "course").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-copy-${Date.now()}`;
    const newCourseRes = await directusFetch("/items/courses", {
      method: "POST",
      body: JSON.stringify({
        title: `Bản sao - ${original.title}`,
        slug,
        description: original.description,
        thumbnail: original.thumbnail,
        price: original.price,
        discount_price: original.discount_price,
        level: original.level,
        category_id: typeof original.category_id === "object" ? original.category_id?.id : original.category_id,
        requirements: original.requirements,
        what_you_will_learn: original.what_you_will_learn,
        target_audience: original.target_audience,
        status: "draft",
        average_rating: 0,
        total_enrollments: 0,
        total_lessons: 0,
        total_duration: 0,
      }),
    });

    if (!newCourseRes.ok) {
      const err = await newCourseRes.json().catch(() => null);
      return NextResponse.json(
        { error: "Không thể tạo khoá học mới.", detail: err },
        { status: newCourseRes.status }
      );
    }

    const newCourse = (await newCourseRes.json()).data;
    const newCourseId = newCourse.id;

    // Create instructor junction
    await directusFetch("/items/courses_instructors", {
      method: "POST",
      body: JSON.stringify({ course_id: newCourseId, user_id: userId }),
    });

    // Clone modules and lessons
    const modules = Array.isArray(original.modules) ? original.modules : [];
    for (const mod of modules) {
      const newModRes = await directusFetch("/items/modules", {
        method: "POST",
        body: JSON.stringify({
          title: mod.title,
          sort: mod.sort,
          course_id: newCourseId,
        }),
      });

      if (!newModRes.ok) continue;
      const newMod = (await newModRes.json()).data;

      const lessons = Array.isArray(mod.lessons) ? mod.lessons : [];
      for (const lesson of lessons) {
        await directusFetch("/items/lessons", {
          method: "POST",
          body: JSON.stringify({
            title: lesson.title,
            type: lesson.type,
            content: lesson.content,
            video_url: lesson.video_url,
            duration: lesson.duration,
            sort: lesson.sort,
            status: lesson.status ?? "draft",
            module_id: newMod.id,
          }),
        });
      }
    }

    return NextResponse.json({
      data: { id: newCourseId, title: newCourse.title, slug: newCourse.slug },
    });
  } catch {
    return NextResponse.json({ error: "Đã có lỗi xảy ra." }, { status: 500 });
  }
}
