import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpenText,
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

function getVideoEmbed(url: string): { type: "youtube" | "vimeo" | "html5"; embedUrl: string } {
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) {
    return {
      type: "youtube",
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`,
    };
  }

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return {
      type: "vimeo",
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
    };
  }

  return { type: "html5", embedUrl: url };
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseSlug: string; lessonSlug: string }>;
}) {
  const { token, user } = await requireAuth();
  const { courseSlug, lessonSlug } = await params;

  const course = await getCourseBySlug(token, courseSlug);
  if (!course) redirect("/my-courses");

  const enrollment = await getEnrollmentByCourseSlug(token, courseSlug);
  if (!enrollment) redirect(`/courses/${courseSlug}`);

  const progressRecords = await getCourseProgress(token, enrollment.id);

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
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;
  const existingReview = await getMyReview(token, course.id, user.id);

  const lessonProgress = progressRecords.find((p: Progress) => {
    const lessonId = typeof p.lesson_id === "object" ? p.lesson_id.id : p.lesson_id;
    return lessonId === lesson.id;
  });

  const isCompleted = lessonProgress?.completed ?? false;
  const videoPosition = lessonProgress?.video_position ?? 0;
  const completedLessonIds = progressRecords
    .filter((p: Progress) => p.completed)
    .map((p: Progress) =>
      typeof p.lesson_id === "object" ? p.lesson_id.id : p.lesson_id
    );
  const isLastLesson = currentIndex === allLessons.length - 1;
  const allCompleted =
    allLessons.length > 0 &&
    allLessons.every((l: Lesson) => completedLessonIds.includes(l.id));

  const progressPercent =
    allLessons.length > 0 ? Math.round(((currentIndex + 1) / allLessons.length) * 100) : 0;

  const lessonTypeLabel = lesson.type === "video" ? "Bài video" : "Bài đọc";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-5 lg:px-6 lg:py-7">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-[#eef3ff] via-[#f7f9ff] to-[#f6efff] p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full bg-white text-slate-700 shadow-sm">{lessonTypeLabel}</Badge>
            {lesson.duration > 0 ? (
              <Badge variant="outline" className="rounded-full border-slate-300 text-slate-600">
                <Clock3 className="mr-1 size-3.5" />
                {formatDuration(lesson.duration)}
              </Badge>
            ) : null}
            <Badge
              variant={isCompleted ? "default" : "outline"}
              className={isCompleted ? "rounded-full" : "rounded-full border-slate-300"}
            >
              {isCompleted ? "Đã hoàn thành" : "Đang học"}
            </Badge>
          </div>

          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {lesson.title}
          </h1>
          <p className="mt-1 text-sm text-slate-600 sm:text-base">{course.title}</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 text-sm">
          <p className="text-slate-600">
            Bài học {currentIndex + 1}/{allLessons.length}
          </p>
          <div className="w-full max-w-xs">
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#2f57ef] to-[#b966e7]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="mt-1 text-right text-xs text-slate-500">Tiến độ {progressPercent}%</p>
          </div>
        </div>
      </section>

      {lesson.video_url ? (
        <section className="overflow-hidden rounded-3xl border border-slate-900/90 bg-slate-950 shadow-[0_20px_55px_-30px_rgba(2,6,23,0.9)]">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-sm text-slate-300">
            <PlayCircle className="size-4 text-blue-300" />
            Trình phát bài học
          </div>
          <div className="relative aspect-video w-full">
            {(() => {
              const video = getVideoEmbed(lesson.video_url);
              if (video.type === "html5") {
                return (
                  <video
                    id="lesson-video"
                    src={video.embedUrl}
                    controls
                    className="size-full"
                  />
                );
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
        </section>
      ) : null}

      <Card className="border-slate-200 bg-white/95 shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <ProgressTracker
            enrollmentId={enrollment.id}
            lessonId={lesson.id}
            isCompleted={isCompleted}
            videoPosition={videoPosition}
          />
        </CardContent>
      </Card>

      {lesson.content ? (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="flex items-center gap-2 text-xl text-slate-900">
              <BookOpenText className="size-5 text-[#2f57ef]" />
              Nội dung bài học
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <div
              className="prose prose-slate max-w-none text-slate-700 prose-headings:text-slate-900 prose-a:text-[#2f57ef]"
              dangerouslySetInnerHTML={{ __html: lesson.content }}
            />
          </CardContent>
        </Card>
      ) : null}

      {lesson.quizzes?.[0] && lesson.quizzes[0].questions ? (
        <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
          <CardHeader className="bg-slate-50/80">
            <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
              <FileQuestion className="size-5 text-[#2f57ef]" />
              {lesson.quizzes[0].title}
            </CardTitle>
            {lesson.quizzes[0].description ? (
              <p className="text-sm text-slate-600">{lesson.quizzes[0].description}</p>
            ) : null}
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <QuizPlayer quiz={lesson.quizzes[0]} />
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-800">Điều hướng bài học</p>
            <p className="text-sm text-slate-500">{currentIndex + 1}/{allLessons.length}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {prevLesson ? (
              <Button
                asChild
                variant="outline"
                className="w-full justify-start border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              >
                <Link href={`/learn/${courseSlug}/${prevLesson.slug}`}>
                  <ChevronLeft className="mr-1 size-4" />
                  Bài trước
                </Link>
              </Button>
            ) : (
              <Button
                variant="outline"
                disabled
                className="w-full justify-start border-slate-300 text-slate-400"
              >
                <ChevronLeft className="mr-1 size-4" />
                Bài trước
              </Button>
            )}

            {nextLesson ? (
              <Button asChild className="w-full justify-end bg-[#2f57ef] text-white hover:bg-[#2447c8]">
                <Link href={`/learn/${courseSlug}/${nextLesson.slug}`}>
                  Bài tiếp theo
                  <ChevronRight className="ml-1 size-4" />
                </Link>
              </Button>
            ) : (
              <Button className="w-full justify-end bg-[#2f57ef] text-white hover:bg-[#2447c8]" disabled>
                Bài tiếp theo
                <ChevronRight className="ml-1 size-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {allCompleted && isLastLesson ? (
        <Card className="overflow-hidden border-emerald-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-emerald-50 to-blue-50 px-5 py-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <Star className="size-4" />
              Bạn đã hoàn thành khóa học - hãy chia sẻ đánh giá
            </p>
          </div>
          <CardHeader>
            <CardTitle>Đánh giá khóa học</CardTitle>
            <p className="text-sm text-slate-600">
              Bạn đã hoàn thành toàn bộ bài học. Đánh giá của bạn sẽ giúp nâng cao chất lượng khóa học.
            </p>
          </CardHeader>
          <CardContent>
            <ReviewForm courseId={course.id} existingReview={existingReview ?? undefined} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
