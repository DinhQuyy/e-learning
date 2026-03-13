import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle,
  Clock,
  TrendingUp,
} from "lucide-react";
import { getUserDisplayName, requireAuth } from "@/lib/dal";
import { directusUrl } from "@/lib/directus";
import { getCourseImageSrc } from "@/lib/course-image";
import { partitionEnrollments } from "@/lib/enrollment-helpers";
import { recalcEnrollmentsProgress } from "@/lib/enrollment-progress";
import { getUserEnrollments } from "@/lib/queries/enrollments";
import {
  getRecommendedByCategories,
  getTrendingCourses,
} from "@/lib/queries/courses";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MentorPlanCard } from "@/components/features/mentor-plan-card";
import { CourseRecommendationSection } from "@/components/features/course-recommendations";
import type { Course, Category, Lesson } from "@/types";

export const dynamic = "force-dynamic";

function formatDuration(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }

  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

type ProgressWithLesson = {
  enrollment_id?: { id?: string } | string | null;
  lesson_id?: { duration?: number | null } | null;
  video_position?: number | null;
  completed?: boolean | null;
};

function getEnrollmentId(value: ProgressWithLesson["enrollment_id"]): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.id ?? null;
}

async function getLearningSecondsByEnrollment(
  token: string,
  enrollmentIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (enrollmentIds.length === 0) return map;

  const res = await fetch(
    `${directusUrl}/items/progress?filter[enrollment_id][_in]=${enrollmentIds.join(",")}&fields=enrollment_id.id,lesson_id.duration,video_position,completed&limit=-1`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    },
  );

  if (!res.ok) return map;

  const data = (await res.json()) as { data?: ProgressWithLesson[] };

  for (const row of data.data ?? []) {
    const enrollmentId = getEnrollmentId(row.enrollment_id);
    if (!enrollmentId) continue;

    const rawDuration = Number(row.lesson_id?.duration ?? 0);
    const lessonDuration =
      Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : 0;

    const rawPosition = Number(row.video_position ?? 0);
    const position =
      Number.isFinite(rawPosition) && rawPosition > 0 ? rawPosition : 0;

    const cappedPosition =
      lessonDuration > 0 ? Math.min(position, lessonDuration) : position;

    const contribution =
      row.completed && lessonDuration > 0
        ? lessonDuration
        : row.completed
          ? Math.max(cappedPosition, position)
          : cappedPosition;

    map.set(enrollmentId, (map.get(enrollmentId) ?? 0) + contribution);
  }

  return map;
}

export default async function StudentDashboard() {
  const { token, user } = await requireAuth();
  const displayName = getUserDisplayName(user);
  const enrollmentsRaw = await getUserEnrollments(token);
  const enrollments = await recalcEnrollmentsProgress(enrollmentsRaw, token);

  const {
    normalized: normalizedEnrollments,
    active: activeEnrollments,
    completed: completedEnrollments,
  } = partitionEnrollments(enrollments);

  const enrollmentIds = normalizedEnrollments.map((item) => item.id).filter(Boolean);
  const progressTimeByEnrollment = await getLearningSecondsByEnrollment(
    token,
    enrollmentIds,
  );

  const totalSeconds = normalizedEnrollments.reduce((acc, enrollment) => {
    const actualSeconds = progressTimeByEnrollment.get(enrollment.id) ?? 0;
    if (actualSeconds > 0) return acc + actualSeconds;

    const course = enrollment.course_id as Course;
    if (!course || typeof course === "string") return acc;

    const duration = Number(course.total_duration ?? 0);
    const progress = enrollment.progress ?? 0;
    if (!duration || !progress) return acc;

    return acc + Math.round((duration * progress) / 100);
  }, 0);

  // Sort active enrollments: ones with recent progress first, then by enrollment date
  const sortedActiveEnrollments = [...activeEnrollments].sort((a, b) => {
    const aHasProgress = a.last_lesson_id ? 1 : 0;
    const bHasProgress = b.last_lesson_id ? 1 : 0;
    if (aHasProgress !== bHasProgress) return bHasProgress - aHasProgress;
    const aProgress = a.progress ?? 0;
    const bProgress = b.progress ?? 0;
    // Active courses with some progress but not finished are prioritized
    if (aProgress > 0 && bProgress === 0) return -1;
    if (bProgress > 0 && aProgress === 0) return 1;
    return 0;
  });
  const recentEnrollments = sortedActiveEnrollments.slice(0, 4);
  const firstRecentCourse = recentEnrollments[0]?.course_id;
  const mentorCourseId =
    firstRecentCourse && typeof firstRecentCourse === "object"
      ? ((firstRecentCourse as Course).id ?? null)
      : null;

  // Extract data for recommendations
  const enrolledCourseIds: string[] = [];
  const enrolledCategoryIds: string[] = [];
  for (const enrollment of normalizedEnrollments) {
    const course = enrollment.course_id as Course | null;
    if (!course || typeof course === "string") continue;
    enrolledCourseIds.push(course.id);
    const cat = course.category_id;
    if (cat && typeof cat === "object") {
      const catId = (cat as Category).id;
      if (catId && !enrolledCategoryIds.includes(catId)) {
        enrolledCategoryIds.push(catId);
      }
    } else if (typeof cat === "string" && !enrolledCategoryIds.includes(cat)) {
      enrolledCategoryIds.push(cat);
    }
  }

  const [recommendedByCategory, trendingCourses] = await Promise.all([
    getRecommendedByCategories(enrolledCourseIds, enrolledCategoryIds, 8),
    getTrendingCourses(enrolledCourseIds, 8),
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.35)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2f57ef]">
              Tổng quan học tập
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              Chào mừng trở lại, {displayName}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Tiếp tục các khóa học đang học và theo dõi tiến độ mỗi ngày.
            </p>
          </div>
          <Button
            asChild
            className="rounded-full border-0 px-5 text-white"
            style={{ backgroundImage: "linear-gradient(90deg, #2f57ef, #b966e7)" }}
          >
            <Link href="/courses">
              Khám phá khóa học
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      <MentorPlanCard courseId={mentorCourseId} />

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl border-0 bg-gradient-to-br from-[#eef3ff] to-[#f5f8ff] shadow-[0_14px_30px_-24px_rgba(47,87,239,0.6)]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-600">Đang học</span>
              <BookOpen className="size-4 text-[#2f57ef]" />
            </div>
            <p className="mt-3 text-3xl font-extrabold text-slate-900">
              {activeEnrollments.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">khóa học đang tiến hành</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 bg-gradient-to-br from-[#ecfdf3] to-[#f4fff8] shadow-[0_14px_30px_-24px_rgba(16,185,129,0.55)]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-600">Hoàn thành</span>
              <CheckCircle className="size-4 text-emerald-600" />
            </div>
            <p className="mt-3 text-3xl font-extrabold text-slate-900">
              {completedEnrollments.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">khóa học đã hoàn tất</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 bg-gradient-to-br from-[#f6efff] to-[#fbf6ff] shadow-[0_14px_30px_-24px_rgba(185,102,231,0.55)]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-600">Thời gian học</span>
              <Clock className="size-4 text-[#a855f7]" />
            </div>
            <p className="mt-3 text-3xl font-extrabold text-slate-900">
              {formatDuration(totalSeconds)}
            </p>
            <p className="mt-1 text-xs text-slate-500">thời lượng đã tích lũy</p>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.35)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Khóa học đang học</h3>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/my-courses">
              Xem tất cả
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        {recentEnrollments.length === 0 ? (
          <Card className="rounded-xl border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <BookOpen className="mb-4 size-12 text-slate-300" />
              <p className="text-sm text-slate-500">Bạn chưa đăng ký khóa học nào.</p>
              <Button asChild className="mt-4 rounded-full">
                <Link href="/courses">Khám phá khóa học</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {recentEnrollments.map((enrollment) => {
              const course = (enrollment.course_id ?? null) as Course | null;
              const lastLesson =
                typeof enrollment.last_lesson_id === "object"
                  ? (enrollment.last_lesson_id as Lesson)
                  : null;

              if (!course || typeof course === "string") return null;

              return (
                <Card key={enrollment.id} className="overflow-hidden rounded-2xl border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="relative size-20 shrink-0 overflow-hidden rounded-xl">
                        <Image
                          src={getCourseImageSrc(course)}
                          alt={course.title}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="line-clamp-2 text-sm font-semibold text-slate-900">
                          {course.title}
                        </h4>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                          {lastLesson?.title
                            ? `Bài gần nhất: ${lastLesson.title}`
                            : "Chưa bắt đầu"}
                        </p>
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">
                              {Math.round(enrollment.progress ?? 0)}% hoàn thành
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-[#2f57ef] transition-all"
                              style={{ width: `${Math.min(100, Math.round(enrollment.progress ?? 0))}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-slate-200 pt-3">
                      <Button variant="ghost" size="sm" asChild className="w-full justify-between">
                        <Link href={`/learn/${course.slug}`}>
                          Tiếp tục học
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <CourseRecommendationSection
        title="Gợi ý cho bạn"
        subtitle="Dựa trên các danh mục bạn đang học"
        courses={recommendedByCategory}
        viewAllHref="/courses"
      />

      <CourseRecommendationSection
        title="Khoá học phổ biến"
        subtitle="Được nhiều học viên đăng ký nhất"
        courses={trendingCourses}
        viewAllHref="/courses"
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.35)]">
        <h3 className="mb-4 text-lg font-bold text-slate-900">Hoạt động gần đây</h3>
        <div className="space-y-3">
          {normalizedEnrollments.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Chưa có hoạt động nào.</p>
          ) : (
            normalizedEnrollments.slice(0, 5).map((enrollment) => {
              const course = (enrollment.course_id ?? null) as Course | null;
              if (!course || typeof course === "string") return null;

              const completed = enrollment.derivedStatus === "completed";
              return (
                <div
                  key={enrollment.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-3"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#eef3ff]">
                    {completed ? (
                      <CheckCircle className="size-4 text-[#2f57ef]" />
                    ) : (
                      <TrendingUp className="size-4 text-[#2f57ef]" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm text-slate-700">
                      {completed ? "Hoàn thành khóa học " : "Đang học "}
                      <span className="font-semibold text-slate-900">{course.title}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Đăng ký: {new Date(enrollment.date_created).toLocaleDateString("vi-VN")}
                    </p>
                  </div>

                  <Badge variant={completed ? "default" : "secondary"}>
                    {completed ? "Hoàn thành" : "Đang học"}
                  </Badge>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
