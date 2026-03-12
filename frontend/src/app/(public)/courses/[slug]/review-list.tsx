"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReviewCard } from "@/components/features/review-card";
import type { Review } from "@/types";

export function ReviewList({ reviews }: { reviews: Review[] }) {
  const [showAll, setShowAll] = useState(false);
  const displayedReviews = showAll ? reviews : reviews.slice(0, 5);
  const remaining = reviews.length - 5;

  return (
    <div className="mt-6 space-y-4">
      {displayedReviews.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}

      {reviews.length > 5 && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? (
            <>
              <ChevronUp className="mr-2 size-4" />
              Thu gọn
            </>
          ) : (
            <>
              <ChevronDown className="mr-2 size-4" />
              Xem thêm {remaining} đánh giá
            </>
          )}
        </Button>
      )}

      {reviews.length === 0 && (
        <p className="text-sm text-slate-500">Chưa có đánh giá nào.</p>
      )}
    </div>
  );
}
