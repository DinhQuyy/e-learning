import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookOpen } from "lucide-react";
import { getCategoryBySlug } from "@/lib/queries/categories";
import { getCoursesByCategory } from "@/lib/queries/courses";
import { CourseCard } from "@/components/features/course-card";
import { CategoryPagination } from "./category-pagination";

export const dynamic = 'force-dynamic';

interface CategoryDetailPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({
  params,
}: CategoryDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) {
    return { title: "Khong tim thay danh muc" };
  }
  return {
    title: category.name,
    description:
      category.description || `Cac khoa hoc thuoc danh muc ${category.name}.`,
  };
}

export default async function CategoryDetailPage({
  params,
  searchParams,
}: CategoryDetailPageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Number(sp.page) || 1;

  const category = await getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const result = await getCoursesByCategory(slug, page, 12);
  const totalPages = Math.ceil(result.total / 12);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{category.name}</h1>
        {category.description && (
          <p className="mt-2 text-muted-foreground">{category.description}</p>
        )}
        <p className="mt-1 text-sm text-muted-foreground">
          {result.total} khoa hoc
        </p>
      </div>

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
            Chua co khoa hoc nao trong danh muc nay
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Cac khoa hoc se som duoc cap nhat.
          </p>
        </div>
      )}

      {totalPages > 1 && (
        <CategoryPagination currentPage={page} totalPages={totalPages} />
      )}
    </div>
  );
}
