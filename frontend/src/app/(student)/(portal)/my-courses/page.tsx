import { requireAuth } from "@/lib/dal";
import { getCourseImageSrc } from "@/lib/course-image";
import { partitionEnrollments } from "@/lib/enrollment-helpers";
import { recalcEnrollmentsProgress } from "@/lib/enrollment-progress";
import { getUserEnrollments } from "@/lib/queries/enrollments";
import {
  getRecommendedByCategories,
  getTrendingCourses,
} from "@/lib/queries/courses";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

export const dynamic = 'force-dynamic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CourseRecommendationSection } from "@/components/features/course-recommendations";
import { BookOpen, ArrowRight, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { Course, Category, Lesson } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

export default async function MyCoursesPage() {
  const { token } = await requireAuth();
  const enrollmentsRaw = await getUserEnrollments(token);
  const enrollments = await recalcEnrollmentsProgress(enrollmentsRaw, token);

  const { normalized: allEnrollments, active: activeEnrollments, completed: completedEnrollments } =
    partitionEnrollments(enrollments);

  // Extract enrolled course/category IDs for recommendations
  const enrolledCourseIds: string[] = [];
  const enrolledCategoryIds: string[] = [];
  for (const enrollment of allEnrollments) {
    const course = enrollment.course_id as Course | null;
    if (!course || typeof course === "string") continue;
    enrolledCourseIds.push(course.id);
    const cat = course.category_id;
    if (cat && typeof cat === "object") {
      const catId = (cat as Category).id;
      if (catId && !enrolledCategoryIds.includes(catId)) enrolledCategoryIds.push(catId);
    } else if (typeof cat === "string" && !enrolledCategoryIds.includes(cat)) {
      enrolledCategoryIds.push(cat);
    }
  }

  const [recommendedCourses, trendingCourses] = await Promise.all([
    getRecommendedByCategories(enrolledCourseIds, enrolledCategoryIds, 8),
    getTrendingCourses(enrolledCourseIds, 8),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Khoá học của tôi</h1>
        <p className="text-muted-foreground">
          Quản lý và tiếp tục các khoá học bạn đã đăng ký
        </p>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">
            Đang học ({activeEnrollments.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Hoàn thành ({completedEnrollments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          {activeEnrollments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <BookOpen className="size-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Bạn chưa có khoá học nào đang học.
                </p>
                <Link href="/courses" className="mt-4">
                  <Button>Khám phá khoá học</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeEnrollments.map((enrollment) => {
                const course = (enrollment.course_id ?? null) as Course | null;
                if (!course || typeof course === "string") return null;

                const lastLesson =
                  typeof enrollment.last_lesson_id === "object"
                    ? (enrollment.last_lesson_id as Lesson)
                    : null;
                const lastLessonSlug =
                  lastLesson && typeof lastLesson.slug === "string"
                    ? lastLesson.slug
                    : null;
                const lastLessonTitle =
                  lastLesson && typeof lastLesson.title === "string"
                    ? lastLesson.title
                    : null;
                const progressPercent = Math.round(enrollment.progress);

                return (
                  <Card
                    key={enrollment.id}
                    className="overflow-hidden py-0 gap-0"
                  >
                    <div className="relative aspect-video w-full overflow-hidden">
                      <Image
                        src={getCourseImageSrc(course)}
                        alt={course.title}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                      <Badge className="absolute bottom-2 left-2" variant="secondary">
                        {progressPercent}% hoàn thành
                      </Badge>
                    </div>
                    <CardContent className="p-4 space-y-3">
                      <h3 className="font-semibold line-clamp-2 leading-snug">
                        {course.title}
                      </h3>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Tiến độ</span>
                          <span className="font-medium text-foreground">
                            {progressPercent}%
                          </span>
                        </div>
                        <Progress value={progressPercent} />
                      </div>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        <span>
                          Đăng ký{" "}
                          {formatDistanceToNow(new Date(enrollment.enrolled_at || enrollment.date_created), {
                            addSuffix: true,
                            locale: vi,
                          })}
                        </span>
                      </div>

                      {lastLessonTitle && (
                        <p className="text-xs text-muted-foreground truncate">
                          Bài gần nhất: {lastLessonTitle}
                        </p>
                      )}

                      <Link
                        href={`/learn/${course.slug}${lastLessonSlug ? `/${lastLessonSlug}` : ""}`}
                      >
                        <Button className="w-full mt-2" size="sm">
                          Tiếp tục học
                          <ArrowRight className="ml-1 size-4" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {completedEnrollments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <CheckCircle className="size-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Bạn chưa hoàn thành khoá học nào.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {completedEnrollments.map((enrollment) => {
                const course = (enrollment.course_id ?? null) as Course | null;
                if (!course || typeof course === "string") return null;
                const progressPercent = Math.round(enrollment.progress);
                return (
                  <Card
                    key={enrollment.id}
                    className="overflow-hidden py-0 gap-0"
                  >
                    <div className="relative aspect-video w-full overflow-hidden">
                      <Image
                        src={getCourseImageSrc(course)}
                        alt={course.title}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                      <Badge className="absolute bottom-2 left-2">
                        <CheckCircle className="mr-1 size-3" />
                        Hoàn thành
                      </Badge>
                    </div>
                    <CardContent className="p-4 space-y-3">
                      <h3 className="font-semibold line-clamp-2 leading-snug">
                        {course.title}
                      </h3>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Tiến độ</span>
                          <span className="font-medium text-foreground">
                            {progressPercent}%
                          </span>
                        </div>
                        <Progress value={progressPercent} />
                      </div>

                      {enrollment.completed_at ? (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CheckCircle className="size-3" />
                          <span>
                            Hoàn thành{" "}
                            {formatDistanceToNow(
                              new Date(enrollment.completed_at),
                              { addSuffix: true, locale: vi }
                            )}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CheckCircle className="size-3" />
                          <span>Hoàn thành dựa trên tiến độ</span>
                        </div>
                      )}

                      <div className="mt-2 grid gap-2">
                        <Link href={`/learn/${course.slug}`}>
                          <Button variant="outline" className="w-full" size="sm">
                            Xem lại khóa học
                          </Button>
                        </Link>
                        <Link href={`/my-certificates/enrollment/${enrollment.id}`}>
                          <Button className="w-full" size="sm">
                            Xem chứng chỉ
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CourseRecommendationSection
        title="Có thể bạn quan tâm"
        subtitle="Dựa trên các danh mục bạn đang học"
        courses={recommendedCourses}
        viewAllHref="/courses"
      />

      <CourseRecommendationSection
        title="Khoá học nổi bật"
        subtitle="Được nhiều học viên đăng ký nhất"
        courses={trendingCourses}
        viewAllHref="/courses"
      />
    </div>
  );
}

