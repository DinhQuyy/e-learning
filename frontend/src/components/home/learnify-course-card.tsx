"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Star, Users } from "lucide-react";
import { getAssetUrl } from "@/lib/directus";
import { cn } from "@/lib/utils";
import type { Category, Course, DirectusUser } from "@/types";

interface LearnifyCourseCardProps {
  course: Course;
  variant?: "hero" | "grid";
  className?: string;
  priority?: boolean;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
}

function getInstructorNames(course: Course): string {
  if (!course.instructors || course.instructors.length === 0) {
    return "Giảng viên";
  }

  const names = course.instructors
    .map((item) => {
      const user = item.user_id as DirectusUser;
      if (!user || typeof user === "string") return "";
      const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
      return fullName || user.email;
    })
    .filter(Boolean);

  return names.length > 0 ? names.join(", ") : "Giảng viên";
}

function getCategoryName(course: Course): string | null {
  if (!course.category_id || typeof course.category_id === "string") return null;
  return (course.category_id as Category).name;
}

function getPriceNode(course: Course) {
  if (course.price === 0) {
    return <span className="text-sm font-bold text-emerald-600">Miễn phí</span>;
  }

  const hasDiscount =
    course.discount_price !== null && course.discount_price < course.price;

  if (hasDiscount && course.discount_price !== null) {
    return (
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-bold text-[var(--learnify-primary)]">
          {formatPrice(course.discount_price)}
        </span>
        <span className="text-xs text-muted-foreground line-through">
          {formatPrice(course.price)}
        </span>
      </div>
    );
  }

  return <span className="text-sm font-bold">{formatPrice(course.price)}</span>;
}

export function LearnifyCourseCard({
  course,
  variant = "grid",
  className,
  priority = false,
}: LearnifyCourseCardProps) {
  const categoryName = getCategoryName(course);
  const ratingValue = Number(course.average_rating ?? 0);
  const roundedRating = Math.round(ratingValue);
  const reviewCount =
    typeof course.review_count === "number"
      ? course.review_count
      : Array.isArray(course.reviews)
        ? course.reviews.length
        : 0;
  const enrollmentCount =
    typeof course.enrollment_count === "number"
      ? course.enrollment_count
      : Number(course.total_enrollments ?? 0);

  return (
    <article
      className={cn(
        "learnify-soft-card overflow-hidden rounded-2xl border bg-card",
        variant === "hero" ? "w-full max-w-none" : "h-full",
        className
      )}
    >
      <Link
        href={`/courses/${course.slug}`}
        className="group flex h-full flex-col"
        aria-label={`Xem chi tiết khóa học ${course.title}`}
      >
        <div className="relative aspect-[16/10] overflow-hidden">
          <Image
            src={getAssetUrl(course.thumbnail)}
            alt={course.title}
            fill
            priority={priority}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes={
              variant === "hero"
                ? "(max-width: 1024px) 100vw, 40vw"
                : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            }
          />
          {categoryName && (
            <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-semibold text-[var(--learnify-heading)]">
              {categoryName}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-5">
          <div className="mb-3 flex items-center gap-3 text-xs text-[var(--learnify-body)]">
            <span className="inline-flex items-center gap-1">
              <BookOpen className="size-3.5" />
              {course.total_lessons || 0} bài học
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" />
              {enrollmentCount}
            </span>
          </div>

          <h3
            className={cn(
              "line-clamp-2 font-semibold text-[var(--learnify-heading)] transition-colors group-hover:text-[var(--learnify-primary)]",
              variant === "hero" ? "text-xl" : "text-lg"
            )}
          >
            {course.title}
          </h3>

          <p className="mt-2 line-clamp-2 text-sm text-[var(--learnify-body)]">
            {course.short_description || course.description || "Khóa học thực hành với nội dung cập nhật."}
          </p>

          <div className="mt-3 flex items-center gap-1 text-xs text-[var(--learnify-body)]">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star
                key={index}
                className={cn(
                  "size-3.5",
                  index < roundedRating
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/30"
                )}
              />
            ))}
            <span className="ml-1 font-semibold text-[var(--learnify-heading)]">
              {ratingValue.toFixed(1)}
            </span>
            <span>({reviewCount})</span>
          </div>

          <p className="mt-2 truncate text-xs text-[var(--learnify-body)]">
            Bởi {getInstructorNames(course)}
          </p>

          <div className="mt-5 flex items-center justify-between border-t pt-4">
            {getPriceNode(course)}
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--learnify-primary)]">
              Chi tiết
              <ArrowRight className="size-4" />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
