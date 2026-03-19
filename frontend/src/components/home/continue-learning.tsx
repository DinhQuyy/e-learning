import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/dal";
import { getCourseImageSrc } from "@/lib/course-image";
import { partitionEnrollments } from "@/lib/enrollment-helpers";
import { recalcEnrollmentsProgress } from "@/lib/enrollment-progress";
import { getUserEnrollments } from "@/lib/queries/enrollments";
import type { Course, Lesson } from "@/types";

export async function ContinueLearningSection() {
  const session = await getSession();
  if (!session) return null;

  let enrollmentsRaw;
  try {
    enrollmentsRaw = await getUserEnrollments(session.token);
  } catch {
    return null;
  }

  if (enrollmentsRaw.length === 0) return null;

  const enrollments = await recalcEnrollmentsProgress(enrollmentsRaw, session.token);
  const { active } = partitionEnrollments(enrollments);

  if (active.length === 0) return null;

  // Sort: courses with recent progress first
  const sorted = [...active].sort((a, b) => {
    const aHasProgress = a.last_lesson_id ? 1 : 0;
    const bHasProgress = b.last_lesson_id ? 1 : 0;
    if (aHasProgress !== bHasProgress) return bHasProgress - aHasProgress;
    const aProgress = a.progress ?? 0;
    const bProgress = b.progress ?? 0;
    if (aProgress > 0 && bProgress === 0) return -1;
    if (bProgress > 0 && aProgress === 0) return 1;
    return 0;
  });

  const courses = sorted.slice(0, 4);

  return (
    <section className="bg-gradient-to-b from-[var(--kiwi-primary)]/5 to-transparent py-10 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <PlayCircle className="size-5 text-[var(--kiwi-primary)]" />
              <p className="text-sm font-semibold text-[var(--kiwi-primary)]">
                Tiếp tục học
              </p>
            </div>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-[var(--kiwi-heading)] sm:text-2xl">
              Tiếp tục nơi bạn đã dừng lại
            </h2>
          </div>
          <Link
            href="/my-courses"
            className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--kiwi-primary)] hover:underline"
          >
            Tất cả khoá học
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {courses.map((enrollment) => {
            const course = enrollment.course_id as Course | null;
            if (!course || typeof course === "string") return null;

            const lastLesson =
              typeof enrollment.last_lesson_id === "object"
                ? (enrollment.last_lesson_id as Lesson)
                : null;
            const progress = Math.round(enrollment.progress ?? 0);

            return (
              <Link
                key={enrollment.id}
                href={`/learn/${course.slug}`}
                className="group flex gap-3 rounded-2xl border border-border bg-card/90 p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative size-16 shrink-0 overflow-hidden rounded-xl sm:size-20">
                  <Image
                    src={getCourseImageSrc(course)}
                    alt={course.title}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                    <PlayCircle className="size-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-sm font-semibold text-[var(--kiwi-heading)] transition-colors group-hover:text-[var(--kiwi-primary)]">
                    {course.title}
                  </h3>
                  <p className="mt-1 line-clamp-1 text-xs text-[var(--kiwi-body)]">
                    {lastLesson?.title
                      ? `Bài: ${lastLesson.title}`
                      : "Chưa bắt đầu"}
                  </p>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[var(--kiwi-primary)]">
                        {progress}%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--kiwi-primary)]/10">
                      <div
                        className="h-full rounded-full bg-[var(--kiwi-primary)] transition-all"
                        style={{ width: `${Math.min(100, progress)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {active.length > 4 && (
          <div className="mt-4 text-center">
            <Button
              asChild
              variant="outline"
              className="rounded-full border-[var(--kiwi-primary)]/20 text-sm font-semibold text-[var(--kiwi-primary)] hover:bg-[var(--kiwi-primary)]/5"
            >
              <Link href="/my-courses">
                Xem {active.length - 4} khoá học khác
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
