import { DEMO_COURSE_IMAGE_OVERRIDES } from "@/app/(public)/courses/demo-course-image-overrides";
import { getAssetUrl } from "@/lib/directus";

interface CourseImageLike {
  slug?: string | null;
  thumbnail?: string | null;
}

export function getCourseImageSrc(course: CourseImageLike | null | undefined): string {
  if (course?.slug) {
    const override = DEMO_COURSE_IMAGE_OVERRIDES[course.slug];
    if (override) return override;
  }

  return getAssetUrl(course?.thumbnail ?? null);
}
