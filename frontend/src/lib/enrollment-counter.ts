import { directusFetch } from "./directus-fetch";

export async function recalculateCourseEnrollments(
  courseId: string
): Promise<void> {
  const courseIdParam = encodeURIComponent(courseId);
  try {
    const aggRes = await directusFetch(
      `/items/enrollments?filter[course_id][_eq]=${courseIdParam}&aggregate[count]=id`
    );

    if (!aggRes.ok) return;

    const aggData = await aggRes.json();
    const count = Number(aggData.data?.[0]?.count?.id ?? 0);

    await directusFetch(`/items/courses/${courseIdParam}`, {
      method: "PATCH",
      body: JSON.stringify({
        total_enrollments: count,
      }),
    });
  } catch {
    // best effort only
  }
}
