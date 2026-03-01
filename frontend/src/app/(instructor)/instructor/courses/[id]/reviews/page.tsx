import { requireRole } from "@/lib/dal";
import {
  verifyInstructorOwnership,
  getCourseReviews,
  getRatingDistribution,
} from "@/lib/queries/instructor";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReviewCard } from "@/components/features/review-card";
import { ArrowLeft, Star, MessageSquare } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function CourseReviewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { id: courseId } = await params;
  const { sort: sortParam } = await searchParams;
  const { token } = await requireRole(["instructor"]);

  const isOwner = await verifyInstructorOwnership(token, courseId);
  if (!isOwner) {
    redirect("/instructor/courses");
  }

  // Determine sort
  let directusSort = "-date_created";
  if (sortParam === "rating_high") directusSort = "-rating";
  if (sortParam === "rating_low") directusSort = "rating";

  const reviews = await getCourseReviews(
    token,
    courseId,
    directusSort
  );
  const ratingDistribution = await getRatingDistribution(
    token,
    courseId
  );

  const totalReviews = Object.values(ratingDistribution).reduce(
    (a, b) => a + b,
    0
  );
  const averageRating =
    totalReviews > 0
      ? Object.entries(ratingDistribution).reduce(
          (acc, [star, count]) => acc + Number(star) * count,
          0
        ) / totalReviews
      : 0;

  const sortOptions = [
    { value: "newest", label: "Mới nhất", href: `?sort=newest` },
    {
      value: "rating_high",
      label: "Đánh giá cao",
      href: `?sort=rating_high`,
    },
    {
      value: "rating_low",
      label: "Đánh giá thấp",
      href: `?sort=rating_low`,
    },
  ];

  const currentSort = sortParam || "newest";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/instructor/courses">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Đánh giá khoá học
            </h1>
            <p className="text-muted-foreground">
              {totalReviews} đánh giá từ học viên
            </p>
          </div>
        </div>
        <Link href={`/instructor/courses/${courseId}/edit`}>
          <Button variant="outline" size="sm">
            Thông tin khoá học
          </Button>
        </Link>
      </div>

      {/* Rating Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Tổng quan đánh giá</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            {/* Average */}
            <div className="flex flex-col items-center gap-1 sm:pr-8 sm:border-r">
              <div className="text-4xl font-bold">
                {averageRating > 0 ? averageRating.toFixed(1) : "--"}
              </div>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`size-4 ${
                      star <= Math.round(averageRating)
                        ? "text-yellow-500 fill-yellow-500"
                        : "text-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                {totalReviews} đánh giá
              </p>
            </div>

            {/* Distribution */}
            <div className="flex-1 space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = ratingDistribution[star] ?? 0;
                const percentage =
                  totalReviews > 0
                    ? Math.round((count / totalReviews) * 100)
                    : 0;
                return (
                  <div key={star} className="flex items-center gap-3">
                    <span className="w-12 text-sm font-medium text-right flex items-center justify-end gap-1">
                      {star}
                      <Star className="size-3 text-yellow-500 fill-yellow-500" />
                    </span>
                    <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-yellow-500 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-14 text-sm text-muted-foreground text-right">
                      {count} ({percentage}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sort & Reviews */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Danh sách đánh giá</h2>
          <div className="flex items-center gap-2">
            {sortOptions.map((option) => (
              <Link key={option.value} href={option.href}>
                <Button
                  variant={
                    currentSort === option.value ? "default" : "outline"
                  }
                  size="sm"
                >
                  {option.label}
                </Button>
              </Link>
            ))}
          </div>
        </div>

        {reviews.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <MessageSquare className="size-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Chưa có đánh giá nào cho khoá học này.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
