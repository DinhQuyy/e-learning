import Link from "next/link";
import { redirect } from "next/navigation";
import { Menu, ExternalLink } from "lucide-react";
import { requireAuth } from "@/lib/dal";
import { directusUrl } from "@/lib/directus";
import {
  getEnrollmentByCourseSlug,
  getCourseProgress,
} from "@/lib/queries/enrollments";
import { CourseSidebar } from "@/components/features/course-sidebar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Course, Lesson, Module, Progress } from "@/types";

async function getCourseBySlug(token: string, slug: string): Promise<Course | null> {
  const res = await fetch(
    `${directusUrl}/items/courses?filter[slug][_eq]=${slug}&fields=*,modules.id,modules.title,modules.sort,modules.lessons.id,modules.lessons.title,modules.lessons.slug,modules.lessons.video_url,modules.lessons.duration,modules.lessons.type,modules.lessons.sort,modules.lessons.status&limit=1`,
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

export default async function CoursePlayerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
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

  const progressRecords = await getCourseProgress(token, enrollment.id);
  const completedLessonIds = progressRecords
    .filter((p: Progress) => p.completed)
    .map((p: Progress) => {
      const lessonId = p.lesson_id;
      return typeof lessonId === "object" ? lessonId.id : lessonId;
    });

  const sortedModules = (course.modules || [])
    .sort((a: Module, b: Module) => a.sort - b.sort)
    .map((mod: Module) => ({
      ...mod,
      lessons: (mod.lessons || [])
        .filter((l: Lesson) => l.status === "published")
        .sort((a: Lesson, b: Lesson) => a.sort - b.sort),
    }));

  const courseWithSortedModules = { ...course, modules: sortedModules };
  const totalLessons = sortedModules.reduce(
    (acc: number, mod: Module) => acc + (mod.lessons?.length ?? 0),
    0
  );
  const progressPercent =
    totalLessons > 0 ? Math.round((completedLessonIds.length / totalLessons) * 100) : 0;

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f7ff]">
      <aside className="hidden lg:flex lg:min-h-0 lg:w-[360px] lg:flex-col lg:overflow-hidden lg:border-r lg:border-slate-200 lg:bg-white/90 lg:backdrop-blur">
        <div className="shrink-0 border-b border-slate-200 bg-gradient-to-r from-[#eef3ff] via-[#f7f9ff] to-[#f6efff] px-5 py-5">
          <Link
            href="/my-courses"
            className="inline-flex text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            &larr; Khóa học của tôi
          </Link>
          <h2 className="mt-3 line-clamp-3 break-words text-base font-semibold leading-6 text-slate-900">
            {course.title}
          </h2>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-600">
            <span>Tiến độ</span>
            <span className="font-semibold text-slate-800">{progressPercent}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#2f57ef] to-[#b966e7]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-600">
           Hoàn thành {completedLessonIds.length}/{totalLessons} bài học
          </p>
        </div>
        <CourseSidebar
          course={courseWithSortedModules}
          currentLessonSlug=""
          completedLessonIds={completedLessonIds}
          totalLessons={totalLessons}
          completedCount={completedLessonIds.length}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="border-b border-slate-200 bg-white/85 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100 lg:hidden"
                >
                  <Menu className="size-5" />
                  <span className="sr-only">Mở menu khóa học</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="gap-0 overflow-hidden w-screen max-w-full border-slate-200 bg-white p-0 sm:w-[min(90vw,360px)] sm:max-w-[360px]"
              >
                <SheetTitle className="sr-only">Điều hướng khóa học</SheetTitle>
                <div className="shrink-0 border-b border-slate-200 bg-gradient-to-r from-[#eef3ff] via-[#f7f9ff] to-[#f6efff] px-5 py-5">
                  <Link
                    href="/my-courses"
                    className="inline-flex text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
                  >
                    &larr; Khóa học của tôi
                  </Link>
                  <h2 className="mt-3 line-clamp-3 break-words text-base font-semibold leading-6 text-slate-900">
                    {course.title}
                  </h2>
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-600">
                    <span>Tiến độ</span>
                    <span className="font-semibold text-slate-800">{progressPercent}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#2f57ef] to-[#b966e7]"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                   Hoàn thành {completedLessonIds.length}/{totalLessons} bài học
                  </p>
                </div>
                <CourseSidebar
                  course={courseWithSortedModules}
                  currentLessonSlug=""
                  completedLessonIds={completedLessonIds}
                  totalLessons={totalLessons}
                  completedCount={completedLessonIds.length}
                />
              </SheetContent>
            </Sheet>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Khóa học
              </p>
              <h1 className="truncate text-sm font-semibold text-slate-900 sm:text-base">
                {course.title}
              </h1>
            </div>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="hidden border-slate-300 bg-white text-slate-700 hover:bg-slate-100 sm:inline-flex"
            >
              <Link href={`/courses/${courseSlug}`}>
                Chi tiết khóa học
                <ExternalLink className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(47,87,239,0.08),transparent_34%),radial-gradient(circle_at_top_right,rgba(185,102,231,0.08),transparent_38%),#f8fafe]">
          {children}
        </main>
      </div>
    </div>
  );
}
