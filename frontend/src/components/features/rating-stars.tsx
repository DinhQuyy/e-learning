"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (rating: number) => void;
  showValue?: boolean;
  className?: string;
}

const sizeMap = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
};

export function RatingStars({
  rating,
  maxRating = 5,
  size = "sm",
  interactive = false,
  onChange,
  showValue = true,
  className,
}: RatingStarsProps) {
  const starSize = sizeMap[size];

  const handleClick = (index: number) => {
    if (interactive && onChange) {
      onChange(index + 1);
    }
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: maxRating }).map((_, index) => {
          const fillPercentage = Math.min(
            Math.max(rating - index, 0),
            1
          );

          return (
            <button
              key={index}
              type="button"
              disabled={!interactive}
              onClick={() => handleClick(index)}
              className={cn(
                "relative p-0 border-0 bg-transparent",
                interactive
                  ? "cursor-pointer hover:scale-110 transition-transform"
                  : "cursor-default"
              )}
            >
              <Star
                className={cn(starSize, "text-muted-foreground/30")}
                strokeWidth={1.5}
              />
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fillPercentage * 100}%` }}
              >
                <Star
                  className={cn(starSize, "text-yellow-500 fill-yellow-500")}
                  strokeWidth={1.5}
                />
              </div>
            </button>
          );
        })}
      </div>
      {showValue && (
        <span
          className={cn(
            "font-medium text-foreground",
            size === "sm" && "text-xs",
            size === "md" && "text-sm",
            size === "lg" && "text-base"
          )}
        >
          {Number(rating).toFixed(1)}
        </span>
      )}
    </div>
  );
}
