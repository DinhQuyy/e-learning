import type { Metadata } from "next";
import { getCourses } from "@/lib/queries/courses";
import { getCategories } from "@/lib/queries/categories";
import { CourseCard } from "@/components/features/course-card";
import { CourseFilters } from "./course-filters";
import { CoursePagination } from "./course-pagination";
import { BookOpen } from "lucide-react";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Khoá học",
  description: "Khám phá tất cả các khoá học trực tuyến chất lượng cao.",
};

interface CoursesPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    category?: string;
    level?: string;
    sort?: string;
  }>;
}

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const search = params.search || "";
  const category = params.category || "";
  const level = params.level || "";
  const sort = params.sort || "newest";

  const [coursesResult, categories] = await Promise.all([
    getCourses({ page, limit: 12, search, category, level, sort }),
    getCategories(),
  ]);

  const totalPages = Math.ceil(coursesResult.total / 12);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Khoá học</h1>
        <p className="mt-2 text-muted-foreground">
          {coursesResult.total > 0
            ? `Tìm thấy ${coursesResult.total} khoá học`
            : "Khám phá các khoá học tuyệt vời"}
        </p>
      </div>

      <CourseFilters
        categories={categories}
        currentCategory={category}
        currentLevel={level}
        currentSort={sort}
      />

      {coursesResult.data.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {coursesResult.data.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="size-16 text-muted-foreground/30" />
          <h3 className="mt-4 text-lg font-semibold">
            Không tìm thấy khoá học
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm để tìm khoá học phù hợp.
          </p>
        </div>
      )}

      {totalPages > 1 && (
        <CoursePagination currentPage={page} totalPages={totalPages} />
      )}
    </div>
  );
}
