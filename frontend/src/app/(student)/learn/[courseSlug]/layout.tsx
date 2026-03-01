import { requireAuth } from "@/lib/dal";
import { directusUrl } from "@/lib/directus";
import { getEnrollmentByCourseSlug, getCourseProgress } from "@/lib/queries/enrollments";
import { CourseSidebar } from "@/components/features/course-sidebar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Course, Module, Lesson, Progress } from "@/types";

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

  // Verify enrollment
  const enrollment = await getEnrollmentByCourseSlug(token, courseSlug);

  if (!enrollment) {
    redirect(`/courses/${courseSlug}`);
  }

  // Get progress records
  const progressRecords = await getCourseProgress(token, enrollment.id);
  const completedLessonIds = progressRecords
    .filter((p: Progress) => p.completed)
    .map((p: Progress) => {
      const lessonId = p.lesson_id;
      return typeof lessonId === "object" ? lessonId.id : lessonId;
    });

  // Sort modules and lessons
  const sortedModules = (course.modules || [])
    .sort((a: Module, b: Module) => a.sort - b.sort)
    .map((mod: Module) => ({
      ...mod,
      lessons: (mod.lessons || [])
        .filter((l: Lesson) => l.status === "published")
        .sort((a: Lesson, b: Lesson) => a.sort - b.sort),
    }));

  const courseWithSortedModules = { ...course, modules: sortedModules };

  // Calculate total and completed for progress
  const totalLessons = sortedModules.reduce(
    (acc: number, mod: Module) => acc + (mod.lessons?.length ?? 0),
    0
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-80 lg:flex-col lg:border-r">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <Link
            href="/my-courses"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Khoá học của tôi
          </Link>
        </div>
        <CourseSidebar
          course={courseWithSortedModules}
          currentLessonSlug=""
          completedLessonIds={completedLessonIds}
          totalLessons={totalLessons}
          completedCount={completedLessonIds.length}
        />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4">
          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="size-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <SheetTitle className="sr-only">Nội dung khoá học</SheetTitle>
              <div className="flex h-14 items-center gap-2 border-b px-4">
                <Link
                  href="/my-courses"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  &larr; Khoá học của tôi
                </Link>
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

          <h1 className="truncate text-sm font-medium">{course.title}</h1>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
