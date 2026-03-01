import Link from "next/link";
import Image from "next/image";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { RatingStars } from "@/components/features/rating-stars";
import { WishlistButton } from "@/components/features/wishlist-button";
import { getAssetUrl } from "@/lib/directus";
import type { Course, DirectusUser, Category } from "@/types";

interface CourseCardProps {
  course: Course;
}

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

function getInstructorNames(course: Course): string {
  if (!course.instructors || course.instructors.length === 0) {
    return "Giảng viên";
  }
  return course.instructors
    .map((ci) => {
      const user = ci.user_id as DirectusUser;
      if (typeof user === "string") return "Giảng viên";
      const name = [user.first_name, user.last_name]
        .filter(Boolean)
        .join(" ");
      return name || user.email;
    })
    .join(", ");
}

function getCategoryName(course: Course): string | null {
  if (!course.category_id) return null;
  if (typeof course.category_id === "number") return null;
  return (course.category_id as Category).name;
}

export function CourseCard({ course }: CourseCardProps) {
  const categoryName = getCategoryName(course);
  const averageRating = Number(course.average_rating ?? 0);
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
    <Link href={`/courses/${course.slug}`} className="group block h-full">
      <Card className="h-full overflow-hidden py-0 transition-shadow hover:shadow-lg">
        <div className="relative aspect-video overflow-hidden">
          <Image
            src={getAssetUrl(course.thumbnail)}
            alt={course.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          {categoryName && (
            <Badge className="absolute top-2 left-2 z-10" variant="secondary">
              {categoryName}
            </Badge>
          )}
          <Badge
            className="absolute top-2 right-2 z-10"
            variant="outline"
          >
            {levelLabels[course.level] || course.level}
          </Badge>
          <WishlistButton courseId={course.id} />
        </div>
        <CardContent className="flex flex-1 flex-col gap-2 p-4">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
            {course.title}
          </h3>
          <p className="text-xs text-muted-foreground truncate">
            {getInstructorNames(course)}
          </p>
          <div className="flex items-center gap-2">
            <RatingStars
              rating={averageRating}
              size="sm"
              showValue
            />
            <span className="text-xs text-muted-foreground">
              ({reviewCount})
            </span>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between border-t p-4 pt-3">
          <div className="flex items-center gap-2">
            {course.discount_price !== null && course.discount_price < course.price ? (
              <>
                <span className="text-sm font-bold text-primary">
                  {formatPrice(course.discount_price)}
                </span>
                <span className="text-xs text-muted-foreground line-through">
                  {formatPrice(course.price)}
                </span>
              </>
            ) : course.price === 0 ? (
              <span className="text-sm font-bold text-green-600">
                Miễn phí
              </span>
            ) : (
              <span className="text-sm font-bold">
                {formatPrice(course.price)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="size-3" />
            <span>{enrollmentCount}</span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
