import { requireRole } from "@/lib/dal";
import { getInstructorCourses } from "@/lib/queries/instructor";
import { InstructorCoursesClient } from "./courses-client";

export const dynamic = "force-dynamic";

export default async function InstructorCoursesPage() {
  const { token } = await requireRole(["instructor"]);
  const courses = await getInstructorCourses(token);

  return <InstructorCoursesClient courses={courses} />;
}
