import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Star, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCourseImageSrc } from "@/lib/course-image";
import type { Course, Category } from "@/types";

const levelLabels: Record<string, string> = {
  beginner: "Cơ bản",
  intermediate: "Trung cấp",
  advanced: "Nâng cao",
  all_levels: "Tất cả",
};

function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
}

function MiniCourseCard({ course }: { course: Course }) {
  const category =
    course.category_id && typeof course.category_id === "object"
      ? (course.category_id as Category)
      : null;
  const rating = Number(course.average_rating ?? 0);
  const enrollments = Number(
    (course as Course & { enrollment_count?: number }).enrollment_count ??
      course.total_enrollments ??
      0
  );
  const price = Number(course.price ?? 0);
  const discountPrice = course.discount_price
    ? Number(course.discount_price)
    : null;

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex min-w-[220px] max-w-[260px] shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        <Image
          src={getCourseImageSrc(course)}
          alt={course.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="260px"
        />
        {course.level && (
          <Badge className="absolute left-2 top-2 text-[10px]" variant="secondary">
            {levelLabels[course.level] ?? course.level}
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {category && (
          <span className="text-[10px] font-medium uppercase tracking-wider text-[#2f57ef]">
            {category.name}
          </span>
        )}
        <h4 className="line-clamp-2 text-sm font-semibold leading-tight text-slate-900">
          {course.title}
        </h4>
        <div className="mt-auto flex items-center gap-2 pt-1 text-xs text-slate-500">
          {rating > 0 && (
            <span className="flex items-center gap-0.5">
              <Star className="size-3 fill-yellow-400 text-yellow-400" />
              {rating.toFixed(1)}
            </span>
          )}
          {enrollments > 0 && (
            <span className="flex items-center gap-0.5">
              <Users className="size-3" />
              {enrollments}
            </span>
          )}
        </div>
        <div className="mt-1 text-sm font-bold text-slate-900">
          {price === 0 ? (
            <span className="text-emerald-600">Miễn phí</span>
          ) : discountPrice && discountPrice < price ? (
            <>
              <span>{formatPrice(discountPrice)}</span>
              <span className="ml-1.5 text-xs font-normal text-slate-400 line-through">
                {formatPrice(price)}
              </span>
            </>
          ) : (
            formatPrice(price)
          )}
        </div>
      </div>
    </Link>
  );
}

interface CourseRecommendationSectionProps {
  title: string;
  subtitle?: string;
  courses: Course[];
  viewAllHref?: string;
}

export function CourseRecommendationSection({
  title,
  subtitle,
  courses,
  viewAllHref,
}: CourseRecommendationSectionProps) {
  if (courses.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.35)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
        {viewAllHref && (
          <Button variant="ghost" size="sm" asChild>
            <Link href={viewAllHref}>
              Xem tất cả
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        )}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200">
        {courses.map((course) => (
          <MiniCourseCard key={course.id} course={course} />
        ))}
      </div>
    </section>
  );
}
