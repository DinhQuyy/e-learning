import { redirect } from "next/navigation";

import { getSession, getUserRole } from "@/lib/dal";
import { getEnrollmentByCourseSlug } from "@/lib/queries/enrollments";

function encodeRedirectPath(courseSlug: string): string {
  return `/continue-learning/${encodeURIComponent(courseSlug)}`;
}

export default async function ContinueLearningPage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?redirect=${encodeURIComponent(encodeRedirectPath(courseSlug))}`);
  }

  const role = getUserRole(session.user);
  if (role !== "student") {
    redirect(`/courses/${encodeURIComponent(courseSlug)}`);
  }

  const enrollment = await getEnrollmentByCourseSlug(session.token, courseSlug);
  if (enrollment) {
    redirect(`/learn/${encodeURIComponent(courseSlug)}`);
  }

  redirect(`/courses/${encodeURIComponent(courseSlug)}`);
}
