import Link from "next/link";
import {
  BookOpen,
  Users,
  GraduationCap,
  ArrowRight,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CourseCard } from "@/components/features/course-card";
import { getFeaturedCourses, getLatestCourses, getPopularCourses, getTopReviews } from "@/lib/queries/courses";
import { getCategories } from "@/lib/queries/categories";
import { directusUrl, getAssetUrl } from "@/lib/directus";
import { cn } from "@/lib/utils";
import type { Course } from "@/types";

export const dynamic = 'force-dynamic';

async function getPlatformStats() {
  try {
    const headers = { "Content-Type": "application/json" };

    const [coursesRes, instructorsRes, studentsRes] = await Promise.all([
      fetch(
        `${directusUrl}/items/courses?aggregate[count]=id&filter[status][_eq]=published`,
        { headers, cache: "no-store" }
      ),
      fetch(
        `${directusUrl}/items/courses_instructors?aggregate[countDistinct]=user_id`,
        { headers, cache: "no-store" }
      ),
      fetch(
        `${directusUrl}/items/enrollments?aggregate[countDistinct]=user_id`,
        { headers, cache: "no-store" }
      ),
    ]);

    const [coursesData, instructorsData, studentsData] = await Promise.all([
      coursesRes.ok ? coursesRes.json() : { data: [{ count: { id: 0 } }] },
      instructorsRes.ok
        ? instructorsRes.json()
        : { data: [{ countDistinct: { user_id: 0 } }] },
      studentsRes.ok
        ? studentsRes.json()
        : { data: [{ countDistinct: { user_id: 0 } }] },
    ]);

    return {
      courses: Number(coursesData.data?.[0]?.count?.id ?? 0),
      instructors: Number(
        instructorsData.data?.[0]?.countDistinct?.user_id ??
          instructorsData.data?.[0]?.countdistinct?.user_id ??
          0
      ),
      students: Number(
        studentsData.data?.[0]?.countDistinct?.user_id ??
          studentsData.data?.[0]?.countdistinct?.user_id ??
          0
      ),
    };
  } catch {
    return { courses: 0, instructors: 0, students: 0 };
  }
}

function formatStatValue(value: number): string {
  if (value >= 1000) {
    return new Intl.NumberFormat("vi-VN").format(value) + "+";
  }
  return value > 0 ? String(value) + "+" : "0";
}

export default async function HomePage() {
  let featuredCourses: Course[] = [];
  try {
    featuredCourses = await getFeaturedCourses(8);
  } catch {
    // Fail silently on homepage; show empty grid
  }

  const platformStats = await getPlatformStats();

  let latestCourses: Course[] = [];
  try {
    latestCourses = await getLatestCourses(8);
  } catch {
    // Fail silently
  }

  let popularCourses: Course[] = [];
  try {
    popularCourses = await getPopularCourses(8);
  } catch {
    // Fail silently
  }

  let dynamicCategories: Awaited<ReturnType<typeof getCategories>> = [];
  try {
    dynamicCategories = await getCategories();
  } catch {
    // Fail silently
  }

  let testimonials: Awaited<ReturnType<typeof getTopReviews>> = [];
  try {
    testimonials = await getTopReviews(6);
  } catch {
    // Fail silently
  }

  const stats = [
    {
      icon: BookOpen,
      value: formatStatValue(platformStats.courses),
      label: "Khoá học",
      description: "Đã được xuất bản",
    },
    {
      icon: GraduationCap,
      value: formatStatValue(platformStats.instructors),
      label: "Giảng viên",
      description: "Chuyên gia hàng đầu",
    },
    {
      icon: Users,
      value: formatStatValue(platformStats.students),
      label: "Học viên",
      description: "Đang theo học",
    },
  ];

  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-linear-to-b from-primary/5 via-background to-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Học Mọi Thứ,{" "}
              <span className="text-primary">Mọi Lúc, Mọi Nơi</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed sm:text-xl">
              Khám phá hàng trăm khoá học chất lượng từ những giảng viên hàng đầu.
              Nâng cao kỹ năng, mở rộng kiến thức và phát triển sự nghiệp của bạn
              ngay hôm nay.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/courses">
                  Khám phá khoá học
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/register?role=instructor">
                  Trở thành giảng viên
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center gap-2 text-center"
              >
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <stat.icon className="size-6 text-primary" />
                </div>
                <div className="text-3xl font-bold">{stat.value}</div>
                <div className="text-sm font-medium">{stat.label}</div>
                <div className="text-xs text-muted-foreground">
                  {stat.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Courses Section */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">
                Khoá học nổi bật
              </h2>
              <p className="mt-2 text-muted-foreground">
                Các khoá học được yêu thích nhất trên nền tảng
              </p>
            </div>
            <Button variant="ghost" asChild className="hidden sm:flex">
              <Link href="/courses">
                Xem tất cả
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          {featuredCourses.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {featuredCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen className="size-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                Chưa có khoá học nổi bật nào. Hãy quay lại sau!
              </p>
            </div>
          )}

          <div className="mt-8 flex justify-center sm:hidden">
            <Button variant="outline" asChild>
              <Link href="/courses">
                Xem tất cả khoá học
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Latest Courses */}
      {latestCourses.length > 0 && (
        <section className="border-t py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold sm:text-3xl">
                  Khoá học mới nhất
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Các khoá học vừa được xuất bản gần đây
                </p>
              </div>
              <Button variant="ghost" asChild className="hidden sm:flex">
                <Link href="/courses?sort=newest">
                  Xem tất cả
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {latestCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Popular Courses */}
      {popularCourses.length > 0 && (
        <section className="border-t bg-muted/10 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold sm:text-3xl">
                  Khoá học phổ biến nhất
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Được nhiều học viên lựa chọn nhất
                </p>
              </div>
              <Button variant="ghost" asChild className="hidden sm:flex">
                <Link href="/courses?sort=popular">
                  Xem tất cả
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {popularCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Categories Section */}
      <section className="border-t bg-muted/20 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Danh mục khoá học
            </h2>
            <p className="mt-2 text-muted-foreground">
              Khám phá khoá học theo lĩnh vực bạn quan tâm
            </p>
          </div>
          {dynamicCategories.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {dynamicCategories.map((cat) => (
                <Link key={cat.id} href={`/categories/${cat.slug}`}>
                  <Card className="h-full transition-shadow hover:shadow-md cursor-pointer">
                    <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                      <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                        <BookOpen className="size-6 text-primary" />
                      </div>
                      <span className="text-sm font-medium">{cat.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {cat.course_count} khoá học
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">
                Chưa có danh mục nào. Hãy quay lại sau!
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="border-t py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-bold sm:text-3xl">
                Học viên nói gì
              </h2>
              <p className="mt-2 text-muted-foreground">
                Đánh giá từ các học viên đã tham gia khoá học
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((review) => {
                const reviewer = review.user_id;
                const course = review.course_id;
                const name =
                  [reviewer.first_name, reviewer.last_name]
                    .filter(Boolean)
                    .join(" ") || reviewer.email;
                const initials = reviewer.first_name && reviewer.last_name
                  ? `${reviewer.first_name[0]}${reviewer.last_name[0]}`
                  : reviewer.email.slice(0, 2).toUpperCase();
                return (
                  <Card key={review.id}>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "size-4",
                              i < review.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground/30"
                            )}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-4">
                        &ldquo;{review.comment}&rdquo;
                      </p>
                      <div className="flex items-center gap-3 pt-2">
                        <Avatar className="size-8">
                          <AvatarImage
                            src={getAssetUrl(reviewer.avatar)}
                            alt={name}
                          />
                          <AvatarFallback className="text-xs">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{name}</p>
                          <Link
                            href={`/courses/${course.slug}`}
                            className="text-xs text-muted-foreground hover:underline"
                          >
                            {course.title}
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="flex flex-col items-center gap-6 p-8 text-center sm:p-12">
              <h2 className="text-2xl font-bold sm:text-3xl">
                Bắt đầu hành trình học tập
              </h2>
              <p className="max-w-xl text-primary-foreground/80">
                Đăng ký ngay để truy cập hàng trăm khoá học chất lượng và bắt đầu
                học với sự hướng dẫn từ những giảng viên tốt nhất.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  variant="secondary"
                  asChild
                >
                  <Link href="/register">
                    Đăng ký miễn phí
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
                  asChild
                >
                  <Link href="/courses">Xem khoá học</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
