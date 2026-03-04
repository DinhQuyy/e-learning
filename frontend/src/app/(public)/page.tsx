import Link from "next/link";
import { Poppins } from "next/font/google";
import { ArrowRight, BookOpen, FolderOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroCourseSlider } from "@/components/home/hero-course-slider";
import { LearnifyCourseCard } from "@/components/home/learnify-course-card";
import { NewsletterStrip } from "@/components/home/newsletter-strip";
import { BlogTeaserGrid } from "@/components/home/blog-teaser-grid";
import { getPopularCourses, getTopReviews } from "@/lib/queries/courses";
import { getCategories } from "@/lib/queries/categories";
import type { Course } from "@/types";

export const dynamic = "force-dynamic";

const poppins = Poppins({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
});

function getReviewSnippet(comment: string | null | undefined): string | null {
  if (!comment) return null;
  const text = comment.trim();
  if (text.length === 0) return null;
  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
}

export default async function HomePage() {
  const [popularResult, categoriesResult, reviewsResult] =
    await Promise.allSettled([
      getPopularCourses(10),
      getCategories(),
      getTopReviews(6),
    ]);

  const popularCourses =
    popularResult.status === "fulfilled" ? popularResult.value : [];
  const featuredCategories =
    categoriesResult.status === "fulfilled"
      ? categoriesResult.value.slice(0, 8)
      : [];
  const topReviews = reviewsResult.status === "fulfilled" ? reviewsResult.value : [];

  const heroCourses = popularCourses.slice(0, 5);
  const popularGridCourses: Course[] = popularCourses.slice(0, 6);
  const reviewSnippet = getReviewSnippet(topReviews[0]?.comment);

  const blogTeasers = [
    {
      badge: "Hướng dẫn",
      title: "Cách xây dựng lộ trình học tập 90 ngày",
      description:
        "Tổng hợp các bước để đặt mục tiêu học tập rõ ràng, theo dõi tiến độ và duy trì động lực mỗi tuần.",
      href: "/help",
    },
    {
      badge: "Hỏi đáp",
      title: "Các câu hỏi thường gặp khi bắt đầu",
      description:
        reviewSnippet ??
        "Tổng hợp những vấn đề học viên mới thường gặp và cách tối ưu hóa trải nghiệm học online.",
      href: "/faq",
    },
    {
      badge: "Gói học",
      title: "So sánh các gói học để tối ưu chi phí",
      description:
        "Xem tổng quan các lựa chọn về giá và quyền lợi để chọn gói học phù hợp với mục tiêu của bạn.",
      href: "/pricing",
    },
  ];

  return (
    <div className={`${poppins.className} learnify-home`}>
      <section className="learnify-hero relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(340px,460px)] lg:gap-10">
            <div className="lg:pr-2">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-[var(--learnify-heading)] shadow-sm">
                <Sparkles className="size-3.5 text-[var(--learnify-primary)]" />
                Nền tảng học tập trực tuyến linh hoạt
              </p>
              <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-[var(--learnify-heading)] sm:text-5xl lg:text-6xl">
                Học trực tuyến
                <span className="text-[var(--learnify-primary)]"> đơn giản</span>, dễ dàng cùng
                <p>E-Learning</p>
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--learnify-body)] sm:text-lg">
                Khám phá kho khóa học chất lượng, lộ trình học rõ ràng và giảng viên
                thực chiến để nâng cấp kỹ năng mỗi ngày.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  className="learnify-btn-gradient h-11 rounded-xl px-6 text-sm font-semibold"
                >
                  <Link href="/courses">
                    Tìm khóa học
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-11 rounded-xl border-[var(--learnify-primary)]/20 bg-white/85 px-6 text-sm font-semibold text-[var(--learnify-heading)] hover:bg-white"
                >
                  <Link href="/register?role=instructor">Trở thành giảng viên</Link>
                </Button>
              </div>

              <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3">
                <div className="rounded-xl border bg-white/85 p-3 text-center shadow-sm">
                  <p className="text-lg font-bold text-[var(--learnify-heading)]">
                    {popularCourses.length > 0 ? `${popularCourses.length}+` : "--"}
                  </p>
                  <p className="text-xs text-[var(--learnify-body)]">Khóa học nổi bật</p>
                </div>
                <div className="rounded-xl border bg-white/85 p-3 text-center shadow-sm">
                  <p className="text-lg font-bold text-[var(--learnify-heading)]">
                    {featuredCategories.length > 0 ? `${featuredCategories.length}+` : "--"}
                  </p>
                  <p className="text-xs text-[var(--learnify-body)]">Danh mục phổ biến</p>
                </div>
                <div className="rounded-xl border bg-white/85 p-3 text-center shadow-sm">
                  <p className="text-lg font-bold text-[var(--learnify-heading)]">
                    {topReviews.length > 0 ? `${topReviews.length}+` : "--"}
                  </p>
                  <p className="text-xs text-[var(--learnify-body)]">Đánh giá tích cực</p>
                </div>
              </div>
            </div>

            <HeroCourseSlider
              courses={heroCourses}
              className="learnify-float lg:justify-self-end"
            />
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--learnify-primary)]">
                Danh mục nổi bật
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-[var(--learnify-heading)] sm:text-3xl">
                Lựa chọn lĩnh vực bạn quan tâm
              </h2>
            </div>
            <Link
              href="/categories"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--learnify-primary)] hover:underline"
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
                  className="learnify-soft-card group rounded-2xl border bg-card p-5"
                >
                  <span className="inline-flex size-10 items-center justify-center rounded-xl bg-[var(--learnify-primary)]/12 text-[var(--learnify-primary)]">
                    <FolderOpen className="size-5" />
                  </span>
                  <h3 className="mt-4 line-clamp-2 text-sm font-semibold text-[var(--learnify-heading)] transition-colors group-hover:text-[var(--learnify-primary)]">
                    {category.name}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--learnify-body)]">
                    {category.course_count} khóa học
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border bg-card p-8 text-center">
              <BookOpen className="mx-auto size-8 text-muted-foreground/60" />
              <p className="mt-3 text-sm text-muted-foreground">
                Chưa có danh mục dữ liệu phù hợp.
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
              <p className="text-sm font-semibold text-[var(--learnify-primary)]">
                Khóa học phổ biến
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-[var(--learnify-heading)] sm:text-3xl">
                Các khóa học được quan tâm nhiều nhất
              </h2>
            </div>
            <Link
              href="/courses?sort=popular"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--learnify-primary)] hover:underline"
            >
              Xem tất cả khóa học
              <ArrowRight className="size-4" />
            </Link>
          </div>

          {popularGridCourses.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {popularGridCourses.map((course, index) => (
                <LearnifyCourseCard
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

      <BlogTeaserGrid items={blogTeasers} />
    </div>
  );
}
