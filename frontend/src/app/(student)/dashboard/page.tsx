import { requireAuth, getUserDisplayName } from "@/lib/dal";
import { directusUrl, getAssetUrl } from "@/lib/directus";
import { partitionEnrollments } from "@/lib/enrollment-helpers";
import { recalcEnrollmentsProgress } from "@/lib/enrollment-progress";
import { getUserEnrollments } from "@/lib/queries/enrollments";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  CheckCircle,
  Clock,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { Course, Lesson } from "@/types";

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
    const enrollmentId =
      (row.enrollment_id as { id?: string } | string | null)?.id ??
      (row.enrollment_id as string | null) ??
      null;
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

  const enrollmentIds = normalizedEnrollments.map((e) => e.id).filter(Boolean);
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

  const recentEnrollments = activeEnrollments.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Xin chào, {displayName}!
        </h1>
        <p className="text-muted-foreground">
          Tiếp tục hành trình học tập của bạn
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Khoá học đang học</CardDescription>
            <BookOpen className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeEnrollments.length}</div>
            <p className="text-xs text-muted-foreground">
              khoá học đang tiến hành
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Khoá học hoàn thành</CardDescription>
            <CheckCircle className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completedEnrollments.length}
            </div>
            <p className="text-xs text-muted-foreground">
              khoá học đã hoàn thành
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Tổng giờ học</CardDescription>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(totalSeconds)}
            </div>
            <p className="text-xs text-muted-foreground">thời gian tích lũy</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Enrolled Courses */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Khoá học đang học</h2>
          <Link href="/my-courses">
            <Button variant="ghost" size="sm">
              Xem tất cả
              <ArrowRight className="ml-1 size-4" />
            </Button>
          </Link>
        </div>

        {recentEnrollments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <BookOpen className="size-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Bạn chưa đăng ký khoá học nào.
              </p>
              <Link href="/courses" className="mt-4">
                <Button>Khám phá khoá học</Button>
              </Link>
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
                <Card key={enrollment.id} className="overflow-hidden">
                  <div className="flex gap-4 p-4">
                    <div className="relative size-20 shrink-0 overflow-hidden rounded-lg">
                      <Image
                        src={getAssetUrl(course.thumbnail)}
                        alt={course.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-between">
                      <div>
                        <h3 className="truncate font-medium text-sm">
                          {course.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {lastLesson?.title
                            ? `Bài gần nhất: ${lastLesson.title}`
                            : "Chưa bắt đầu"}
                        </p>
                      </div>
                      <div className="mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {enrollment.derivedStatus === "completed"
                            ? "Hoàn thành"
                            : "Đang học"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="border-t px-4 py-3">
                    <Link href={`/learn/${course.slug}`}>
                      <Button variant="ghost" size="sm" className="w-full">
                        Tiếp tục học
                        <ArrowRight className="ml-1 size-4" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Hoạt động gần đây</h2>
        <Card>
          <CardContent className="divide-y">
            {normalizedEnrollments.length === 0 ? (
              <p className="py-6 text-center text-muted-foreground">
                Chưa có hoạt động nào
              </p>
            ) : (
              normalizedEnrollments.slice(0, 5).map((enrollment) => {
                const course = (enrollment.course_id ?? null) as Course | null;
                if (!course || typeof course === "string") return null;
                return (
                  <div
                    key={enrollment.id}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      {enrollment.derivedStatus === "completed" ? (
                        <CheckCircle className="size-4 text-primary" />
                      ) : (
                        <TrendingUp className="size-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        {enrollment.derivedStatus === "completed"
                          ? "Hoàn thành khoá học"
                          : "Đang học"}{" "}
                        <span className="font-medium">{course.title}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Đăng ký:{" "}
                        {new Date(enrollment.date_created).toLocaleDateString(
                          "vi",
                        )}
                      </p>
                    </div>
                    <Badge
                      variant={
                        enrollment.derivedStatus === "completed"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {enrollment.derivedStatus === "completed"
                        ? "Hoàn thành"
                        : "Đang học"}
                    </Badge>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

