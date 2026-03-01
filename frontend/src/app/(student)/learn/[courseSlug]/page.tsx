import { requireAuth } from "@/lib/dal";
import { directusUrl } from "@/lib/directus";
import { getEnrollmentByCourseSlug } from "@/lib/queries/enrollments";
import { redirect } from "next/navigation";
import type { Course, Module, Lesson } from "@/types";

export const dynamic = 'force-dynamic';

async function getCourseBySlug(
  token: string,
  slug: string
): Promise<Course | null> {
  const res = await fetch(
    `${directusUrl}/items/courses?filter[slug][_eq]=${slug}&fields=*,modules.id,modules.sort,modules.lessons.id,modules.lessons.slug,modules.lessons.sort,modules.lessons.status&limit=1`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) return null;
  const data = await res.json();
  return data.data?.[0] ?? null;
}

export default async function CoursePlayerPage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { token } = await requireAuth();
  const { courseSlug } = await params;

  const course = await getCourseBySlug(token, courseSlug);

  if (!course) {
    redirect("/my-courses");
  }

  const enrollment = await getEnrollmentByCourseSlug(token, courseSlug);

  if (!enrollment) {
    redirect(`/courses/${courseSlug}`);
  }

  // Find the first lesson and redirect to it
  const sortedModules = (course.modules || [])
    .sort((a: Module, b: Module) => a.sort - b.sort);

  for (const mod of sortedModules) {
    const lessons = (mod.lessons || [])
      .filter((l: Lesson) => l.status === "published")
      .sort((a: Lesson, b: Lesson) => a.sort - b.sort);

    if (lessons.length > 0) {
      redirect(`/learn/${courseSlug}/${lessons[0].slug}`);
    }
  }

  // If no lessons found, redirect back
  redirect("/my-courses");
}
