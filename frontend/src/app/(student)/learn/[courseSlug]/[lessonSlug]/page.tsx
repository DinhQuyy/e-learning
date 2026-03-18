import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpenText,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileQuestion,
  PlayCircle,
  Star,
} from "lucide-react";
import { requireAuth } from "@/lib/dal";
import { directusUrl } from "@/lib/directus";
import {
  getCourseProgress,
  getEnrollmentByCourseSlug,
} from "@/lib/queries/enrollments";
import { ProgressTracker } from "@/components/features/progress-tracker";
import { QuizPlayer } from "@/components/features/quiz-player";
import { ReviewForm } from "@/components/features/review-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Course, Lesson, Module, Progress, Review } from "@/types";

export const dynamic = "force-dynamic";

async function getCourseBySlug(token: string, slug: string): Promise<Course | null> {
  const res = await fetch(
    `${directusUrl}/items/courses?filter[slug][_eq]=${slug}&fields=*,modules.id,modules.title,modules.sort,modules.lessons.id,modules.lessons.title,modules.lessons.slug,modules.lessons.content,modules.lessons.video_url,modules.lessons.duration,modules.lessons.type,modules.lessons.sort,modules.lessons.status,modules.lessons.quizzes.id,modules.lessons.quizzes.title,modules.lessons.quizzes.description,modules.lessons.quizzes.passing_score,modules.lessons.quizzes.time_limit,modules.lessons.quizzes.max_attempts,modules.lessons.quizzes.questions.id,modules.lessons.quizzes.questions.question_text,modules.lessons.quizzes.questions.question_type,modules.lessons.quizzes.questions.explanation,modules.lessons.quizzes.questions.sort,modules.lessons.quizzes.questions.points,modules.lessons.quizzes.questions.answers.id,modules.lessons.quizzes.questions.answers.answer_text,modules.lessons.quizzes.questions.answers.is_correct,modules.lessons.quizzes.questions.answers.sort&limit=1`,
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

async function getMyReview(token: string, courseId: string, userId: string): Promise<Review | null> {
  const res = await fetch(
    `${directusUrl}/items/reviews?filter[course_id][_eq]=${courseId}&filter[user_id][_eq]=${userId}&limit=1`,
    {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      next: { revalidate: 0 },
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.data?.[0] ?? null;
}

function getVideoEmbed(url: string): { type: "youtube" | "vimeo" | "html5"; embedUrl: string } {
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return { type: "youtube", embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0` };
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return { type: "vimeo", embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  return { type: "html5", embedUrl: url };
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function readSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === "string" && first.trim() ? first.trim() : null;
  }
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseSlug: string; lessonSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token, user } = await requireAuth();
  const { courseSlug, lessonSlug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const fromAiReferences = readSearchParam(resolvedSearchParams.from) === "ai-references";

  const course = await getCourseBySlug(token, courseSlug);
  if (!course) redirect("/my-courses");

  const sortedModules = (course.modules || [])
    .sort((a: Module, b: Module) => a.sort - b.sort)
    .map((mod: Module) => ({
      ...mod,
      lessons: (mod.lessons || [])
        .filter((l: Lesson) => l.status === "published")
        .sort((a: Lesson, b: Lesson) => a.sort - b.sort),
    }));

  const allLessons: Lesson[] = sortedModules.flatMap((mod: Module) => mod.lessons || []);
  const currentIndex = allLessons.findIndex((l: Lesson) => l.slug === lessonSlug);
  if (currentIndex === -1) redirect(`/learn/${courseSlug}`);

  const lesson = allLessons[currentIndex];
  const currentModule =
    sortedModules.find((m) => m.lessons.some((l: Lesson) => l.id === lesson.id)) ?? null;
  const enrollment = await getEnrollmentByCourseSlug(token, courseSlug);

  if (!enrollment) {
    if (fromAiReferences) {
      const p = new URLSearchParams({ from: "ai-references" });
      if (currentModule?.id) p.set("module", String(currentModule.id));
      p.set("lesson", String(lesson.id));
      redirect(`/courses/${courseSlug}?${p.toString()}#lesson-${lesson.id}`);
    }
    redirect(`/courses/${courseSlug}`);
  }

  const progressRecords = await getCourseProgress(token, enrollment.id);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;
  const existingReview = await getMyReview(token, course.id, user.id);

  const lessonProgress = progressRecords.find((p: Progress) => {
    const lid = typeof p.lesson_id === "object" ? p.lesson_id.id : p.lesson_id;
    return lid === lesson.id;
  });

  const isCompleted = lessonProgress?.completed ?? false;
  const videoPosition = lessonProgress?.video_position ?? 0;
  const completedLessonIds = progressRecords
    .filter((p: Progress) => p.completed)
    .map((p: Progress) => (typeof p.lesson_id === "object" ? p.lesson_id.id : p.lesson_id));

  const isLastLesson = currentIndex === allLessons.length - 1;
  const allCompleted =
    allLessons.length > 0 && allLessons.every((l: Lesson) => completedLessonIds.includes(l.id));

  const progressPercent =
    allLessons.length > 0 ? Math.round((completedLessonIds.length / allLessons.length) * 100) : 0;

  const lessonTypeLabel = lesson.type === "video" ? "Video" : "Bài đọc";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-4 py-6 lg:px-8 lg:py-8">

      {/* ── Lesson header ── */}
      <div
        className={
          fromAiReferences
            ? "overflow-hidden rounded-2xl border border-cyan-200 bg-white shadow-sm"
            : "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        }
      >
        <div
          className={
            fromAiReferences
              ? "border-b border-cyan-100 bg-linear-to-r from-cyan-50 to-sky-50 px-5 py-4 sm:px-6"
              : "border-b border-slate-100 bg-linear-to-r from-[#eef3ff] to-[#f6efff] px-5 py-4 sm:px-6"
          }
        >
          {/* AI badge */}
          {fromAiReferences && (
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-cyan-200 bg-white/80 px-3 py-2 text-sm text-cyan-800">
              <Bookmark className="size-4 shrink-0 text-cyan-600" />
              Bài học được Trợ lý AI gợi ý cho chủ đề bạn vừa tìm.
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className={
                lesson.type === "video"
                  ? "rounded-full bg-[#2f57ef]/10 text-[#2f57ef] hover:bg-[#2f57ef]/15"
                  : "rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
              }
            >
              {lesson.type === "video" ? (
                <PlayCircle className="mr-1 size-3" />
              ) : (
                <BookOpenText className="mr-1 size-3" />
              )}
              {lessonTypeLabel}
            </Badge>

            {lesson.duration > 0 && (
              <Badge variant="outline" className="rounded-full border-slate-200 text-slate-500">
                <Clock3 className="mr-1 size-3" />
                {formatDuration(lesson.duration)}
              </Badge>
            )}

            <Badge
              className={
                isCompleted
                  ? "rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  : "rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              }
            >
              {isCompleted ? (
                <><CheckCircle2 className="mr-1 size-3" />Đã hoàn thành</>
              ) : (
                "Đang học"
              )}
            </Badge>
          </div>

          <h1 className="mt-3 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {lesson.title}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">{course.title}</p>
        </div>

        {/* Progress bar row */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
          <p className="text-xs text-slate-500">
            Bài <span className="font-semibold text-slate-700">{currentIndex + 1}</span> / {allLessons.length}
          </p>
          <div className="flex items-center gap-2">
            <div className="w-32 overflow-hidden rounded-full bg-slate-100" style={{ height: 6 }}>
              <div
                className="h-full rounded-full bg-linear-to-r from-[#2f57ef] to-[#b966e7]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-[#2f57ef]">{progressPercent}%</span>
          </div>
        </div>
      </div>

      {/* ── Video player ── */}
      {lesson.video_url && (
        <div className="overflow-hidden rounded-2xl border border-slate-900/80 bg-slate-950 shadow-[0_16px_48px_-20px_rgba(2,6,23,0.8)]">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
            <PlayCircle className="size-4 text-blue-400" />
            <span className="text-xs font-medium text-slate-300">Trình phát bài học</span>
          </div>
          <div className="relative aspect-video w-full">
            {(() => {
              const video = getVideoEmbed(lesson.video_url);
              if (video.type === "html5") {
                return <video id="lesson-video" src={video.embedUrl} controls className="size-full" />;
              }
              return (
                <iframe
                  title={`lesson-${lesson.id}`}
                  src={video.embedUrl}
                  className="size-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Mark complete ── */}
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <ProgressTracker
          enrollmentId={enrollment.id}
          lessonId={lesson.id}
          isCompleted={isCompleted}
          videoPosition={videoPosition}
        />
      </div>

      {/* ── Lesson content ── */}
      {lesson.content && (
        <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-slate-50/60 pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
              <BookOpenText className="size-5 text-[#2f57ef]" />
              Nội dung bài học
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 sm:p-7">
            <div
              className="lesson-content prose prose-slate max-w-none"
              dangerouslySetInnerHTML={{ __html: lesson.content }}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Quiz ── */}
      {lesson.quizzes?.[0]?.questions && (
        <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-linear-to-r from-[#eef3ff] to-[#f6efff]">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
              <FileQuestion className="size-5 text-[#2f57ef]" />
              {lesson.quizzes[0].title}
            </CardTitle>
            {lesson.quizzes[0].description && (
              <p className="text-sm text-slate-500">{lesson.quizzes[0].description}</p>
            )}
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <QuizPlayer quiz={lesson.quizzes[0]} context={{ courseId: course.id, lessonId: lesson.id }} />
          </CardContent>
        </Card>
      )}

      {/* ── Navigation ── */}
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">Điều hướng bài học</p>
          <p className="text-xs text-slate-400">{currentIndex + 1} / {allLessons.length}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {prevLesson ? (
            <Button
              asChild
              variant="outline"
              className="w-full justify-start rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <Link href={`/learn/${courseSlug}/${prevLesson.slug}`}>
                <ChevronLeft className="mr-1 size-4 shrink-0" />
                <span className="truncate">{prevLesson.title}</span>
              </Link>
            </Button>
          ) : (
            <Button variant="outline" disabled className="w-full justify-start rounded-xl border-slate-200 text-slate-300">
              <ChevronLeft className="mr-1 size-4" />
              Bài trước
            </Button>
          )}

          {nextLesson ? (
            <Button
              asChild
              className="w-full justify-end rounded-xl bg-[#2f57ef] text-white hover:bg-[#2447c8]"
            >
              <Link href={`/learn/${courseSlug}/${nextLesson.slug}`}>
                <span className="truncate">{nextLesson.title}</span>
                <ChevronRight className="ml-1 size-4 shrink-0" />
              </Link>
            </Button>
          ) : (
            <Button disabled className="w-full justify-end rounded-xl bg-slate-100 text-slate-400">
              Bài tiếp theo
              <ChevronRight className="ml-1 size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* ── Completion review ── */}
      {allCompleted && isLastLesson && (
        <Card className="overflow-hidden rounded-2xl border-emerald-200 bg-white shadow-sm">
          <div className="bg-linear-to-r from-emerald-50 to-teal-50 px-5 py-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <Star className="size-4 fill-emerald-400 text-emerald-400" />
              Chúc mừng! Bạn đã hoàn thành toàn bộ khóa học 🎉
            </p>
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Đánh giá khóa học</CardTitle>
            <p className="text-sm text-slate-500">
              Chia sẻ cảm nhận để giúp cải thiện chất lượng khóa học cho những học viên tiếp theo.
            </p>
          </CardHeader>
          <CardContent>
            <ReviewForm courseId={course.id} existingReview={existingReview ?? undefined} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
