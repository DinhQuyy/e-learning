import { redirect } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { getInstructorCourses } from "@/lib/queries/instructor";

interface InstructorCourseRedirectPageProps {
  params: Promise<{ id: string }>;
}

export default async function InstructorCourseRedirectPage({
  params,
}: InstructorCourseRedirectPageProps) {
  const [{ id }, { token }] = await Promise.all([
    params,
    requireRole(["instructor"]),
  ]);

  const courses = await getInstructorCourses(token);
  const course = courses.find((item) => item.id === id);

  if (!course) {
    redirect("/instructor/courses");
  }

  if (course.status === "published" && course.slug) {
    redirect(`/courses/${course.slug}`);
  }

  redirect(`/instructor/courses/${id}/edit`);
}
