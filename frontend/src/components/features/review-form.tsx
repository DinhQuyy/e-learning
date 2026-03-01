"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { apiPatch, apiPost } from "@/lib/api-fetch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Review } from "@/types";

const reviewSchema = z.object({
  rating: z.number().min(1, "Vui lòng chọn số sao").max(5),
  comment: z.string().optional(),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

interface ReviewFormProps {
  courseId: string;
  existingReview?: Review;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Đang chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Bị từ chối",
};

export function ReviewForm({ courseId, existingReview }: ReviewFormProps) {
  const [hoveredStar, setHoveredStar] = useState(0);
  const [mode, setMode] = useState<"view" | "editing">(
    existingReview ? "view" : "editing"
  );
  const [review, setReview] = useState<Review | null>(existingReview ?? null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: existingReview?.rating ?? 0,
      comment: existingReview?.comment ?? "",
    },
  });

  useEffect(() => {
    setReview(existingReview ?? null);
    setMode(existingReview ? "view" : "editing");
    reset({
      rating: existingReview?.rating ?? 0,
      comment: existingReview?.comment ?? "",
    });
  }, [existingReview, reset]);

  useEffect(() => {
    reset({
      rating: review?.rating ?? 0,
      comment: review?.comment ?? "",
    });
  }, [review, reset]);

  const currentRating = watch("rating");
  const isEditingExisting = mode === "editing" && !!review;

  const onSubmit = async (data: ReviewFormData) => {
    try {
      const payload = {
        rating: data.rating,
        comment: data.comment || null,
      };

      const res = review
        ? await apiPatch(`/api/reviews/${review.id}`, payload)
        : await apiPost("/api/reviews", { course_id: courseId, ...payload });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Lỗi gửi đánh giá");
      }

      const updatedReview: Review = {
        ...(review ?? {}),
        ...(resData.data ?? {}),
        ...payload,
      };

      setReview(updatedReview);
      setMode("view");

      toast.success(
        review ? "Đã cập nhật đánh giá" : "Đánh giá của bạn đã được gửi. Cảm ơn bạn!"
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi gửi đánh giá");
    }
  };

  const renderStars = (value: number, size: "sm" | "md" = "md") => (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${size === "md" ? "size-6" : "size-5"} ${
            i < value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
          }`}
        />
      ))}
    </div>
  );

  if (mode === "view" && review) {
    return (
      <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {renderStars(review.rating, "sm")}
            <span className="text-sm font-medium">{review.rating}/5</span>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {STATUS_LABEL[review.status] ?? review.status}
          </span>
        </div>
        {review.comment && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {review.comment}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setMode("editing")}>
            Chỉnh sửa đánh giá
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Star Rating */}
      <div className="space-y-2">
        <Label>Đánh giá</Label>
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => {
            const starValue = i + 1;
            return (
              <button
                key={i}
                type="button"
                className="focus:outline-none"
                onMouseEnter={() => setHoveredStar(starValue)}
                onMouseLeave={() => setHoveredStar(0)}
                onClick={() =>
                  setValue("rating", starValue, { shouldValidate: true })
                }
              >
                <Star
                  className={`size-7 transition-colors ${
                    starValue <= (hoveredStar || currentRating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground hover:text-yellow-300"
                  }`}
                />
              </button>
            );
          })}
          {currentRating > 0 && (
            <span className="ml-2 text-sm text-muted-foreground">
              {currentRating}/5
            </span>
          )}
        </div>
        {errors.rating && (
          <p className="text-xs text-destructive">{errors.rating.message}</p>
        )}
      </div>

      {/* Comment */}
      <div className="space-y-2">
        <Label htmlFor="comment">Nhận xét (tùy chọn)</Label>
        <Textarea
          id="comment"
          placeholder="Chia sẻ trải nghiệm của bạn về khoá học..."
          rows={4}
          {...register("comment")}
        />
      </div>

      {/* Submit */}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isSubmitting} className="gap-2">
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          {isEditingExisting ? "Lưu thay đổi" : "Gửi đánh giá"}
        </Button>
        {review && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              reset({
                rating: review.rating,
                comment: review.comment ?? "",
              });
              setHoveredStar(0);
              setMode("view");
            }}
          >
            Hủy
          </Button>
        )}
      </div>
    </form>
  );
}
