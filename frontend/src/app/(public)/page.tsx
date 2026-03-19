import Link from "next/link";
import { ArrowRight, BookOpen, FolderOpen, Quote, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroCourseSlider } from "@/components/home/hero-course-slider";
import { KiwiCourseCard } from "@/components/home/kiwi-course-card";
import { NewsletterStrip } from "@/components/home/newsletter-strip";
import { BlogTeaserGrid } from "@/components/home/blog-teaser-grid";
import { Suspense } from "react";
import {
  getPopularCourses,
  getTopReviews,
  getPlatformStats,
} from "@/lib/queries/courses";
import { ContinueLearningSection } from "@/components/home/continue-learning";
import {
  getCategories,
  type CategoryWithCount,
} from "@/lib/queries/categories";
import type { Course } from "@/types";

export const dynamic = "force-dynamic";

function getReviewSnippet(comment: string | null | undefined): string | null {
  if (!comment) return null;
  const text = comment.trim();
  if (text.length === 0) return null;
  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
}

function hasParentCategory(parent: unknown): boolean {
  if (!parent) return false;
  if (typeof parent === "string") return parent.length > 0;
  if (typeof parent === "number") return true;
  if (typeof parent === "object") {
    return Boolean((parent as { id?: string | number | null }).id);
  }
  return false;
}

function sortFeaturedCategories(a: CategoryWithCount, b: CategoryWithCount) {
  if (a.course_count !== b.course_count) {
    return b.course_count - a.course_count;
  }
  return a.name.localeCompare(b.name, "vi");
}

export default async function HomePage() {
  const [popularResult, categoriesResult, reviewsResult, statsResult] =
    await Promise.allSettled([
      getPopularCourses(10),
      getCategories(),
      getTopReviews(6),
      getPlatformStats(),
    ]);
  const popularCourses =
    popularResult.status === "fulfilled" ? popularResult.value : [];
  const allCategories =
    categoriesResult.status === "fulfilled"
      ? categoriesResult.value
      : [];
  const childCategories = allCategories
    .filter(
      (category) =>
        hasParentCategory(category.parent_id) && Number(category.course_count) > 0
    )
    .sort(sortFeaturedCategories);
  const featuredCategories = childCategories.slice(0, 8);
  const topReviews = reviewsResult.status === "fulfilled" ? reviewsResult.value : [];
  const platformStats = statsResult.status === "fulfilled" ? statsResult.value : null;

  const heroCourses = popularCourses.slice(0, 5);
  const popularGridCourses: Course[] = popularCourses.slice(0, 6);
  const reviewSnippet = getReviewSnippet(topReviews[0]?.comment);

  const blogTeasers = [
    {
      badge: "Bí quyết",
      title: "90 ngày đổi đời — từ zero đến có việc",
      description:
        "Lộ trình học thực tế: đặt mục tiêu tuần, luyện tập theo dự án và theo dõi tiến độ mỗi ngày — đủ để bạn tự tin nộp CV sau 3 tháng.",
      href: "/help",
    },
    {
      badge: "Hỏi đáp",
      title: "Câu hỏi của bạn — chúng tôi đã có câu trả lời",
      description:
        reviewSnippet ??
        "Học như thế nào cho hiệu quả? Làm sao nhận chứng chỉ? Giải đáp tất cả để bạn bắt đầu đúng cách ngay từ ngày đầu tiên.",
      href: "/faq",
    },
    {
      badge: "Ưu đãi",
      title: "Tiết kiệm đến 40% khi chọn gói học thông minh",
      description:
        "So sánh các gói học và quyền lợi đi kèm — học không giới hạn, hỗ trợ 1-1 từ giảng viên, truy cập trọn đời.",
      href: "/pricing",
    },
  ];

  return (
    <div className="kiwi-home">
      <section className="kiwi-hero relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(340px,460px)] lg:gap-10">
            <div className="lg:pr-2">
              <p className="inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-xs font-semibold text-(--kiwi-heading) shadow-sm backdrop-blur">
                <Sparkles className="size-3.5 text-(--kiwi-primary)" />
                Nền tảng học trực tuyến dành cho người Việt
              </p>
              <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-(--kiwi-heading) sm:text-5xl lg:text-6xl">
                <span className="block">Học đúng kỹ năng.</span>
                <span className="block text-(--kiwi-primary)">Làm đúng việc.</span>
                <span className="block text-(--kiwi-secondary)">Sống đúng đam mê.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-(--kiwi-body) sm:text-lg">
                Không học lý thuyết suông. Mỗi khóa học là lộ trình thực hành — từ bài toán thực tế, dự án có phản hồi, đến kỹ năng được nhà tuyển dụng tìm kiếm nhiều nhất hiện nay.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  className="kiwi-btn-gradient h-11 rounded-xl px-6 text-sm font-semibold"
                >
                  <Link href="/courses">
                    Bắt đầu học ngay
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-11 rounded-xl border-(--kiwi-primary)/20 bg-card/85 px-6 text-sm font-semibold text-(--kiwi-heading) hover:bg-card"
                >
                  <Link href="/register?role=instructor">Trở thành giảng viên</Link>
                </Button>
              </div>

              <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3">
                <div className="rounded-xl border bg-card/80 p-3 text-center shadow-sm backdrop-blur">
                  <p className="text-lg font-bold text-(--kiwi-heading)">
                    {platformStats?.totalCourses ? `${platformStats.totalCourses}+` : popularCourses.length > 0 ? `${popularCourses.length}+` : "--"}
                  </p>
                  <p className="text-xs text-(--kiwi-body)">Khóa học</p>
                </div>
                <div className="rounded-xl border bg-card/80 p-3 text-center shadow-sm backdrop-blur">
                  <p className="text-lg font-bold text-(--kiwi-heading)">
                    {platformStats?.totalStudents ? platformStats.totalStudents.toLocaleString("vi-VN") : "--"}
                  </p>
                  <p className="text-xs text-(--kiwi-body)">Học viên</p>
                </div>
                <div className="rounded-xl border bg-card/80 p-3 text-center shadow-sm backdrop-blur">
                  <p className="text-lg font-bold text-(--kiwi-heading)">
                    {platformStats?.totalInstructors ? platformStats.totalInstructors : "--"}
                  </p>
                  <p className="text-xs text-(--kiwi-body)">Giảng viên</p>
                </div>
              </div>
            </div>

            <HeroCourseSlider
              courses={heroCourses}
              className="kiwi-float lg:justify-self-end"
            />
          </div>
        </div>
      </section>

      <Suspense fallback={null}>
        <ContinueLearningSection />
      </Suspense>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-(--kiwi-primary)">
                Chọn con đường của bạn
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-(--kiwi-heading) sm:text-3xl">
                Đa dạng lĩnh vực — một nơi học tập
              </h2>
              <p className="mt-2 text-sm text-(--kiwi-body)">
                Dù bạn muốn đổi nghề, thăng tiến hay theo đuổi đam mê mới — chúng tôi có khóa học phù hợp đang chờ bạn.
              </p>
            </div>
            <Link
              href="/categories"
              className="inline-flex items-center gap-1 text-sm font-semibold text-(--kiwi-primary) hover:underline"
            >
              Xem tất cả
              <ArrowRight className="size-4" />
            </Link>
          </div>

          {featuredCategories.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {featuredCategories.map((category) => (
                <Link
                  key={category.id}
                  href={`/categories/${category.slug}`}
                  className="kiwi-soft-card group rounded-2xl border bg-card/95 p-5 transition-transform duration-200 hover:-translate-y-1"
                >
                  <span className="inline-flex size-10 items-center justify-center rounded-xl bg-(--kiwi-primary)/12 text-(--kiwi-primary)">
                    <FolderOpen className="size-5" />
                  </span>
                  <h3 className="mt-4 line-clamp-2 text-sm font-semibold text-(--kiwi-heading) transition-colors group-hover:text-(--kiwi-primary)">
                    {category.name}
                  </h3>
                  <p className="mt-1 text-xs text-(--kiwi-body)">
                    {category.course_count} khóa học
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border bg-card p-8 text-center">
              <BookOpen className="mx-auto size-8 text-muted-foreground/60" />
              <p className="mt-3 text-sm text-muted-foreground">
                Chưa có danh mục con có khóa học để hiển thị.
              </p>
            </div>
          )}
        </div>
      </section>

      <NewsletterStrip reviewCount={topReviews.length} />

      <section className="pb-16 pt-2 sm:pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-(--kiwi-primary)">
                Đang hot nhất tuần này
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-(--kiwi-heading) sm:text-3xl">
                Top khóa học không thể bỏ lỡ
              </h2>
            </div>
            <Link
              href="/courses?sort=popular"
              className="inline-flex items-center gap-1 text-sm font-semibold text-(--kiwi-primary) hover:underline"
            >
              Xem tất cả khóa học
              <ArrowRight className="size-4" />
            </Link>
          </div>

          {popularGridCourses.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {popularGridCourses.map((course, index) => (
                <KiwiCourseCard
                  key={course.id}
                  course={course}
                  variant="grid"
                  priority={index < 2}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Chưa có khóa học phổ biến để hiển thị.
              </p>
            </div>
          )}
        </div>
      </section>

      {topReviews.length > 0 && (
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 text-center">
              <p className="text-sm font-semibold text-(--kiwi-primary)">
                Họ đã thay đổi từ đây
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-(--kiwi-heading) sm:text-3xl">
                Mỗi đánh giá là một hành trình có thật
              </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {topReviews.slice(0, 6).map((review) => {
                const userName = review.user_id
                  ? [review.user_id.first_name, review.user_id.last_name].filter(Boolean).join(" ") || review.user_id.email
                  : "Học viên";
                return (
                  <div
                    key={review.id}
                    className="kiwi-soft-card rounded-2xl border bg-card/95 p-6"
                  >
                    <Quote className="size-6 text-(--kiwi-primary)/40" />
                    <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-(--kiwi-body)">
                      {review.comment}
                    </p>
                    <div className="mt-4 flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`size-3.5 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                        />
                      ))}
                    </div>
                    <div className="mt-3 border-t pt-3">
                      <p className="text-sm font-semibold text-(--kiwi-heading)">
                        {userName}
                      </p>
                      {review.course_id && (
                        <Link
                          href={`/courses/${review.course_id.slug}`}
                          className="text-xs text-(--kiwi-body) hover:text-(--kiwi-primary)"
                        >
                          {review.course_id.title}
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <BlogTeaserGrid items={blogTeasers} />
    </div>
  );
}
