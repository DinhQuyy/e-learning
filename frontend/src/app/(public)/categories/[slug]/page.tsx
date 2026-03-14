import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, ChevronRight } from "lucide-react";
import { getCategoryBySlug, getCategories } from "@/lib/queries/categories";
import { getCoursesByCategory } from "@/lib/queries/courses";
import { CourseCard } from "@/components/features/course-card";
import { CategoryPagination } from "./category-pagination";
import { CategoryFilters } from "./category-filters";

export const dynamic = "force-dynamic";

interface CategoryDetailPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; sort?: string; level?: string }>;
}

export async function generateMetadata({
  params,
}: CategoryDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) {
    return { title: "Không tìm thấy danh mục" };
  }
  return {
    title: category.name,
    description:
      category.description || `Các khóa học thuộc danh mục ${category.name}.`,
  };
}

export default async function CategoryDetailPage({
  params,
  searchParams,
}: CategoryDetailPageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Number(sp.page) || 1;
  const sort = sp.sort || "newest";
  const level = sp.level || "";

  const [category, allCategories] = await Promise.all([
    getCategoryBySlug(slug),
    getCategories(),
  ]);

  if (!category) {
    notFound();
  }

  // Find parent category for breadcrumb
  const parentCategory =
    category.parent_id && typeof category.parent_id === "object"
      ? (category.parent_id as { id: string; name: string; slug: string })
      : typeof category.parent_id === "string"
        ? allCategories.find((c) => c.id === category.parent_id)
        : null;

  const result = await getCoursesByCategory(slug, page, 12, {
    sort,
    level: level || undefined,
  });
  const totalPages = Math.ceil(result.total / 12);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/categories" className="hover:text-foreground">
          Danh mục
        </Link>
        {parentCategory && (
          <>
            <ChevronRight className="size-3.5" />
            <Link
              href={`/categories/${(parentCategory as { slug: string }).slug}`}
              className="hover:text-foreground"
            >
              {(parentCategory as { name: string }).name}
            </Link>
          </>
        )}
        <ChevronRight className="size-3.5" />
        <span className="font-medium text-foreground">{category.name}</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">{category.name}</h1>
        {category.description && (
          <p className="mt-2 text-muted-foreground">{category.description}</p>
        )}
        <p className="mt-1 text-sm text-muted-foreground">
          {result.total} khóa học
        </p>
      </div>

      {/* Filters */}
      <Suspense fallback={null}>
        <CategoryFilters currentSort={sort} currentLevel={level} />
      </Suspense>

      {result.data.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {result.data.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="size-16 text-muted-foreground/30" />
          <h3 className="mt-4 text-lg font-semibold">
            Chưa có khóa học nào trong danh mục này
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Các khóa học sẽ sớm được cập nhật.
          </p>
        </div>
      )}

      {totalPages > 1 && (
        <CategoryPagination currentPage={page} totalPages={totalPages} />
      )}
    </div>
  );
}
