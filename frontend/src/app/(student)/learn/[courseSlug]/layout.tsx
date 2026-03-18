import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, ExternalLink, Menu } from "lucide-react";
import { requireAuth } from "@/lib/dal";
import { directusUrl } from "@/lib/directus";
import {
  getEnrollmentByCourseSlug,
  getCourseProgress,
} from "@/lib/queries/enrollments";
import { CourseSidebar } from "@/components/features/course-sidebar";
import { ResizableSidebar } from "@/components/features/resizable-sidebar";
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
  if (!course) redirect("/my-courses");

  const enrollment = await getEnrollmentByCourseSlug(token, courseSlug);
  if (!enrollment) redirect(`/courses/${courseSlug}`);

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
  const completedCount = completedLessonIds.length;
  const progressPercent =
    totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f7ff]">
      {/* ── Desktop Sidebar (resizable) ── */}
      <ResizableSidebar
        header={
          <div className="border-b border-slate-100 bg-linear-to-br from-[#2f57ef]/5 via-white to-[#b966e7]/5 px-5 py-5">
            <Link
              href="/my-courses"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-[#2f57ef]"
            >
              <BookOpen className="size-3.5" />
              Khóa học của tôi
            </Link>
            <h2 className="mt-2.5 line-clamp-2 text-sm font-semibold leading-snug text-slate-900">
              {course.title}
            </h2>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Tiến độ học tập</span>
                <span className="font-semibold text-[#2f57ef]">{progressPercent}%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-linear-to-r from-[#2f57ef] to-[#b966e7] transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {completedCount}/{totalLessons} bài đã hoàn thành
              </p>
            </div>
          </div>
        }
      >
        <CourseSidebar
          course={courseWithSortedModules}
          currentLessonSlug=""
          completedLessonIds={completedLessonIds}
          totalLessons={totalLessons}
          completedCount={completedCount}
        />
      </ResizableSidebar>

      {/* ── Main content ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top header */}
        <header className="z-10 border-b border-slate-200/80 bg-white/90 shadow-[0_1px_8px_-2px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
            {/* Mobile menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden"
                >
                  <Menu className="size-5" />
                  <span className="sr-only">Mở menu khóa học</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[min(90vw,320px)] border-slate-200 bg-white p-0"
              >
                <SheetTitle className="sr-only">Điều hướng khóa học</SheetTitle>
                <div className="border-b border-slate-100 bg-linear-to-br from-[#2f57ef]/5 via-white to-[#b966e7]/5 px-5 py-5">
                  <Link
                    href="/my-courses"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#2f57ef]"
                  >
                    <BookOpen className="size-3.5" />
                    Khóa học của tôi
                  </Link>
                  <h2 className="mt-2.5 line-clamp-2 text-sm font-semibold leading-snug text-slate-900">
                    {course.title}
                  </h2>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Tiến độ</span>
                      <span className="font-semibold text-[#2f57ef]">{progressPercent}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#2f57ef] to-[#b966e7]"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {completedCount}/{totalLessons} bài đã hoàn thành
                    </p>
                  </div>
                </div>
                <CourseSidebar
                  course={courseWithSortedModules}
                  currentLessonSlug=""
                  completedLessonIds={completedLessonIds}
                  totalLessons={totalLessons}
                  completedCount={completedCount}
                />
              </SheetContent>
            </Sheet>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#2f57ef]/70">
                Đang học
              </p>
              <h1 className="truncate text-sm font-semibold text-slate-800 sm:text-base">
                {course.title}
              </h1>
            </div>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="hidden shrink-0 rounded-xl border-slate-200 bg-white text-xs text-slate-600 hover:bg-slate-50 sm:inline-flex"
            >
              <Link href={`/courses/${courseSlug}`}>
                Chi tiết khóa học
                <ExternalLink className="ml-1.5 size-3.5" />
              </Link>
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#f4f7ff]">
          {children}
        </main>
      </div>
    </div>
  );
}