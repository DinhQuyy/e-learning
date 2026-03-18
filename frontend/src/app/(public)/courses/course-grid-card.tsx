import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Users } from "lucide-react";
import { RatingStars } from "@/components/features/rating-stars";
import { WishlistButton } from "@/components/features/wishlist-button";
import { getCourseImageSrc } from "@/lib/course-image";
import { getAssetUrl } from "@/lib/directus";
import { cn } from "@/lib/utils";
import type { Category, Course, DirectusUser } from "@/types";

interface CourseGridCardProps {
  course: Course;
  variant?: "grid" | "list";
  priority?: boolean;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
}

function stripHtml(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getCategoryName(course: Course): string | null {
  if (!course.category_id || typeof course.category_id === "string") {
    return null;
  }
  return (course.category_id as Category).name;
}

function getPrimaryInstructor(course: Course): {
  name: string;
  avatar: string | null;
} {
  const first = course.instructors?.[0];
  if (!first) {
    return { name: "Giảng viên", avatar: null };
  }

  const user = first.user_id as DirectusUser;
  if (!user || typeof user === "string") {
    return { name: "Giảng viên", avatar: null };
  }

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
  return {
    name: fullName || user.email || "Giảng viên",
    avatar: user.avatar ?? null,
  };
}

function CourseCoverMedia({
  course,
  variant,
  priority,
}: {
  course: Course;
  variant: "grid" | "list";
  priority: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden",
        variant === "grid" ? "h-[210px]" : "h-[220px] md:h-auto md:w-[320px] md:shrink-0"
      )}
    >
      <Image
        src={getCourseImageSrc(course)}
        alt={course.title}
        fill
        priority={priority}
        className="object-cover transition-transform duration-500 group-hover:scale-105"
        sizes={
          variant === "grid"
            ? "(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            : "(max-width: 768px) 100vw, 320px"
        }
      />
    </div>
  );
}

function getDiscountInfo(course: Course) {
  if (
    course.discount_price === null ||
    course.discount_price <= 0 ||
    course.discount_price >= course.price
  ) {
    return null;
  }

  const savedAmount = course.price - course.discount_price;
  const percent = Math.round((savedAmount / course.price) * 100);
  return {
    currentPrice: course.discount_price,
    originalPrice: course.price,
    savedAmount,
    percent,
  };
}

function getPriceNode(course: Course, variant: "grid" | "list") {
  const price = Number(course.price ?? 0);
  const discountPrice =
    course.discount_price !== null && course.discount_price !== undefined
      ? Number(course.discount_price)
      : null;
  const effectivePrice =
    discountPrice !== null && discountPrice >= 0 && discountPrice < price
      ? discountPrice
      : price;

  if (effectivePrice === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-800">
        Miễn phí
      </span>
    );
  }

  const discountInfo = getDiscountInfo(course);
  if (discountInfo) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "font-bold text-[#1d4ed8]",
              variant === "list" ? "text-lg" : "text-base"
            )}
          >
            {formatPrice(discountInfo.currentPrice)}
          </span>
          <span className="text-sm text-muted-foreground line-through">
            {formatPrice(discountInfo.originalPrice)}
          </span>
          <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-600 ring-1 ring-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:ring-rose-800">
            -{discountInfo.percent}%
          </span>
        </div>
        <span className="text-xs font-medium text-emerald-600">
          Tiết kiệm {formatPrice(discountInfo.savedAmount)}
        </span>
      </div>
    );
  }

  return (
    <span className={cn("font-bold text-foreground", variant === "list" ? "text-lg" : "text-base")}>
      {formatPrice(course.price)}
    </span>
  );
}

export function CourseGridCard({
  course,
  variant = "grid",
  priority = false,
}: CourseGridCardProps) {
  const rating = Number(course.average_rating ?? 0);
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
  const instructor = getPrimaryInstructor(course);
  const categoryName = getCategoryName(course);
  const description =
    stripHtml(course.short_description) ||
    stripHtml(course.description) ||
    "Nội dung khóa học được cập nhật liên tục với lộ trình rõ ràng.";
  const initials = instructor.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <article
      className={cn(
        "group overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300",
        variant === "grid"
          ? "h-full shadow-[0_20px_45px_-35px_rgba(15,23,42,0.45)] hover:-translate-y-1 hover:shadow-[0_30px_65px_-35px_rgba(47,87,239,0.45)]"
          : "shadow-[0_20px_45px_-40px_rgba(15,23,42,0.4)] hover:shadow-[0_28px_55px_-42px_rgba(47,87,239,0.4)]"
      )}
    >
      <Link
        href={`/courses/${course.slug}`}
        className={cn("flex", variant === "grid" ? "h-full flex-col" : "flex-col md:flex-row")}
      >
        <CourseCoverMedia
          course={course}
          variant={variant}
          priority={priority}
        />

        <div className={cn("flex flex-1 flex-col p-5", variant === "list" && "md:p-6")}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <RatingStars rating={rating} size="sm" showValue={false} />
              <span className="text-xs font-medium text-muted-foreground">
                ({reviewCount} đánh giá)
              </span>
            </div>
            <WishlistButton
              courseId={course.id}
              className="!static !bottom-auto !right-auto !size-8 !border !border-border !bg-card hover:!bg-[#eef3ff] dark:hover:!bg-[#2f57ef]/15"
            />
          </div>

          {categoryName ? (
            <span className="mt-3 inline-flex w-fit items-center rounded-full bg-[#eef3ff] px-2.5 py-1 text-xs font-semibold text-[#2f57ef]">
              {categoryName}
            </span>
          ) : null}

          <h3
            className={cn(
              "mt-3 font-semibold leading-snug text-foreground transition-colors group-hover:text-[#2f57ef]",
              variant === "grid" ? "line-clamp-2 text-lg" : "line-clamp-2 text-xl"
            )}
          >
            {course.title}
          </h3>

          <ul className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <li className="inline-flex items-center gap-1.5">
              <BookOpen className="size-3.5" />
              {course.total_lessons || 0} bài học
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Users className="size-3.5" />
              {enrollmentCount} học viên
            </li>
          </ul>

          <p
            className={cn(
              "mt-3 text-sm leading-relaxed text-muted-foreground",
              variant === "grid" ? "line-clamp-3" : "line-clamp-2 md:line-clamp-3"
            )}
          >
            {description}
          </p>

          <div className="mt-4 flex items-center gap-3">
            <div className="relative size-10 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
              {instructor.avatar ? (
                <Image
                  src={getAssetUrl(instructor.avatar)}
                  alt={instructor.name}
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-muted-foreground">
                  {initials || "GV"}
                </span>
              )}
            </div>
            <p className="line-clamp-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{instructor.name}</span>
              {categoryName ? (
                <>
                  {" "}
                  tại <span className="font-medium text-foreground">{categoryName}</span>
                </>
              ) : null}
            </p>
          </div>

          <div
            className={cn(
              "mt-5 border-t border-border pt-4",
              variant === "grid"
                ? "flex items-center justify-between"
                : "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            )}
          >
            {getPriceNode(course, variant)}
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#2f57ef]">
              Học ngay
              <ArrowRight className="size-4" />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
