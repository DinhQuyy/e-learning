import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";
import { getCourses } from "@/lib/queries/courses";
import { getCategories } from "@/lib/queries/categories";
import { CourseFilters } from "./course-filters";
import { CourseToolbar } from "./course-toolbar";
import { CoursePagination } from "./course-pagination";
import { CourseGridCard } from "./course-grid-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Khóa học",
  description: "Danh sách khóa học trực tuyến chất lượng cao.",
};

interface CoursesPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    category?: string;
    level?: string;
    price?: string;
    rating?: string;
    sort?: string;
    view?: string;
  }>;
}

const COURSES_PER_PAGE = 9;

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const search = params.search || "";
  const category = params.category || "";
  const level = params.level || "";
  const price = params.price || "";
  const rating = params.rating || "";
  const sort = params.sort || "newest";
  const view = params.view === "list" ? "list" : "grid";
  const shouldSwapFirstTwoBetweenPage1And2 = Boolean(
    !search &&
      !category &&
      !level &&
      !price &&
      !rating &&
      sort === "newest" &&
      (page === 1 || page === 2)
  );

  const ratingNumber = Number(rating);

  const [coursesResult, categories, swapSourceResult] = await Promise.all([
    getCourses({
      page,
      limit: COURSES_PER_PAGE,
      search,
      category,
      level,
      price,
      rating: Number.isNaN(ratingNumber) ? undefined : ratingNumber,
      sort,
    }),
    getCategories(),
    shouldSwapFirstTwoBetweenPage1And2
      ? getCourses({
          page: page === 1 ? 2 : 1,
          limit: COURSES_PER_PAGE,
          search,
          category,
          level,
          price,
          rating: Number.isNaN(ratingNumber) ? undefined : ratingNumber,
          sort,
        })
      : Promise.resolve(null),
  ]);

  const totalPages = Math.ceil(coursesResult.total / COURSES_PER_PAGE);
  const startIndex =
    coursesResult.total === 0 ? 0 : (page - 1) * COURSES_PER_PAGE + 1;
  const endIndex = Math.min(page * COURSES_PER_PAGE, coursesResult.total);
  let displayCourses = coursesResult.data;

  if (shouldSwapFirstTwoBetweenPage1And2 && swapSourceResult?.data?.length) {
    const swapCount = Math.min(2, swapSourceResult.data.length, coursesResult.data.length);
    if (swapCount > 0) {
      displayCourses = [
        ...swapSourceResult.data.slice(0, swapCount),
        ...coursesResult.data.slice(swapCount),
      ];
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-[#eef3ff] via-[#f7f9ff] to-background dark:from-slate-900/40 dark:via-slate-900/20 dark:to-background">
        <div className="absolute -left-28 top-8 size-64 rounded-full bg-[#2f57ef]/10 blur-3xl" />
        <div className="absolute -right-24 top-10 size-64 rounded-full bg-[#7c8cff]/10 blur-3xl" />
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-10 sm:px-6 lg:px-8 lg:pb-12 lg:pt-12">
          <ul className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <li>
              <Link href="/" className="transition-colors hover:text-[#2f57ef]">
                Trang chủ
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="size-4" />
            </li>
            <li className="font-medium text-muted-foreground">Danh sách khóa học</li>
          </ul>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Danh sách khóa học
              </h1>
              <p className="mt-2 text-base text-muted-foreground">
                Khám phá lộ trình học thực chiến, cập nhật thường xuyên theo nhu cầu.
              </p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full bg-card px-4 py-2 text-sm font-semibold text-[#2f57ef] shadow-sm ring-1 ring-[#2f57ef]/15">
              {coursesResult.total} khóa học
            </span>
          </div>

          <div className="mt-8">
            <CourseToolbar
              currentSort={sort}
              currentView={view}
              totalCourses={coursesResult.total}
              startIndex={startIndex}
              endIndex={endIndex}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
          <CourseFilters
            categories={categories}
            currentSearch={search}
            currentCategory={category}
            currentLevel={level}
            currentPrice={price}
            currentRating={rating}
          />

          <div>
            {displayCourses.length > 0 ? (
              <div
                className={
                  view === "list"
                    ? "flex flex-col gap-5"
                    : "grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
                }
              >
                {displayCourses.map((course, index) => (
                  <CourseGridCard
                    key={course.id}
                    course={course}
                    variant={view}
                    priority={index < 3}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card px-6 py-16 text-center shadow-[0_20px_45px_-35px_rgba(15,23,42,0.55)]">
                <BookOpen className="mx-auto size-10 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  Không tìm thấy khóa học
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm để xem thêm kết quả
                  phù hợp.
                </p>
              </div>
            )}

            {totalPages > 1 ? (
              <CoursePagination currentPage={page} totalPages={totalPages} />
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
