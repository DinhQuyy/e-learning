import { directusFetch } from "./directus-fetch";

export async function recalculateCourseRating(
  courseId: string
): Promise<void> {
  const courseIdParam = encodeURIComponent(courseId);

  try {
    const aggRes = await directusFetch(
      `/items/reviews?filter[course_id][_eq]=${courseIdParam}&filter[status][_eq]=approved&aggregate[avg]=rating&aggregate[count]=id`
    );

    if (!aggRes.ok) return;

    const aggData = await aggRes.json();
    const avgRating = aggData.data?.[0]?.avg?.rating;
    const reviewCount = Number(aggData.data?.[0]?.count?.id ?? 0);

    await directusFetch(`/items/courses/${courseIdParam}`, {
      method: "PATCH",
      body: JSON.stringify({
        average_rating:
          reviewCount > 0 && avgRating !== null && avgRating !== undefined
            ? Math.round(parseFloat(avgRating) * 10) / 10
            : 0,
      }),
    });
  } catch {
    // Best-effort; keep response success even if recalculation fails
  }
}
