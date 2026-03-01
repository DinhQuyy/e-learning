import { requireAuth } from "@/lib/dal";
import { directusUrl } from "@/lib/directus";
import {
  getEnrollmentByCourseSlug,
  getCourseProgress,
} from "@/lib/queries/enrollments";
import { ProgressTracker } from "@/components/features/progress-tracker";
import { QuizPlayer } from "@/components/features/quiz-player";
import { ReviewForm } from "@/components/features/review-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Course, Module, Lesson, Progress, Review } from "@/types";

export const dynamic = 'force-dynamic';

async function getCourseBySlug(
  token: string,
  slug: string
): Promise<Course | null> {
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

async function getMyReview(
  token: string,
  courseId: string,
  userId: string
): Promise<Review | null> {
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
  // YouTube
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) {
    return {
      type: "youtube",
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`,
    };
  }

  // Vimeo
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

  // Get progress records
  const progressRecords = await getCourseProgress(token, enrollment.id);

  // Flatten all lessons in order
  const sortedModules = (course.modules || [])
    .sort((a: Module, b: Module) => a.sort - b.sort)
    .map((mod: Module) => ({
      ...mod,
      lessons: (mod.lessons || [])
        .filter((l: Lesson) => l.status === "published")
        .sort((a: Lesson, b: Lesson) => a.sort - b.sort),
    }));

  const allLessons: Lesson[] = sortedModules.flatMap(
    (mod: Module) => mod.lessons || []
  );

  // Find current lesson
  const currentIndex = allLessons.findIndex(
    (l: Lesson) => l.slug === lessonSlug
  );
  if (currentIndex === -1) redirect(`/learn/${courseSlug}`);

  const lesson = allLessons[currentIndex];
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  const existingReview = await getMyReview(token, course.id, user.id);

  // Find progress for this lesson
  const lessonProgress = progressRecords.find((p: Progress) => {
    const lessonId =
      typeof p.lesson_id === "object" ? p.lesson_id.id : p.lesson_id;
    return lessonId === lesson.id;
  });

  const isCompleted = lessonProgress?.completed ?? false;
  const videoPosition = lessonProgress?.video_position ?? 0;

  // Check if last lesson and all completed for review prompt
  const isLastLesson = currentIndex === allLessons.length - 1;
  const completedLessonIds = progressRecords
    .filter((p: Progress) => p.completed)
    .map((p: Progress) =>
      typeof p.lesson_id === "object" ? p.lesson_id.id : p.lesson_id
    );
  const allCompleted =
    allLessons.length > 0 &&
    allLessons.every((l: Lesson) => completedLessonIds.includes(l.id));

  return (
    <div className="mx-auto max-w-4xl p-4 lg:p-6 space-y-6">
      {/* Video Player */}
      {lesson.video_url && (
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
          {(() => {
            const video = getVideoEmbed(lesson.video_url);
            if (video.type === "html5") {
              return (
                <video
                  src={video.embedUrl}
                  controls
                  className="size-full"
                  id="lesson-video"
                />
              );
            }
            return (
              <iframe
                src={video.embedUrl}
                className="size-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            );
          })()}
        </div>
      )}

      {/* Lesson Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="capitalize">
            {lesson.type === "video" ? "Video" : "Bài đọc"}
          </Badge>
          {lesson.duration > 0 && (
            <span className="text-sm text-muted-foreground">
              {formatDuration(lesson.duration)}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold">{lesson.title}</h1>
      </div>

      {/* Progress Tracker */}
      <ProgressTracker
        enrollmentId={enrollment.id}
        lessonId={lesson.id}
        isCompleted={isCompleted}
        videoPosition={videoPosition}
      />

      <Separator />

      {/* Lesson Content */}
      {lesson.content && (
        <div
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: lesson.content }}
        />
      )}

      {/* Quiz Section */}
      {lesson.quizzes?.[0] && lesson.quizzes[0].questions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5" />
              {lesson.quizzes[0].title}
            </CardTitle>
            {lesson.quizzes[0].description && (
              <p className="text-sm text-muted-foreground">
                {lesson.quizzes[0].description}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <QuizPlayer quiz={lesson.quizzes[0]} />
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Navigation */}
      <div className="flex items-center justify-between">
        {prevLesson ? (
          <Link href={`/learn/${courseSlug}/${prevLesson.slug}`}>
            <Button variant="outline">
              <ChevronLeft className="mr-1 size-4" />
              Bài trước
            </Button>
          </Link>
        ) : (
          <div />
        )}

        {nextLesson ? (
          <Link href={`/learn/${courseSlug}/${nextLesson.slug}`}>
            <Button>
              Bài tiếp theo
              <ChevronRight className="ml-1 size-4" />
            </Button>
          </Link>
        ) : (
          <div />
        )}
      </div>

      {/* Review Form - shown when course is completed */}
      {allCompleted && isLastLesson && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle>Đánh giá khoá học</CardTitle>
              <p className="text-sm text-muted-foreground">
                Chúc mừng bạn đã hoàn thành khoá học! Hãy chia sẻ cảm nhận của bạn.
              </p>
            </CardHeader>
            <CardContent>
              <ReviewForm
                courseId={course.id}
                existingReview={existingReview ?? undefined}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
