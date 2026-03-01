"use client";

import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch, apiPost } from "@/lib/api-fetch";
import { cn } from "@/lib/utils";

interface WishlistButtonProps {
  courseId: string;
  className?: string;
}

export function WishlistButton({ courseId, className }: WishlistButtonProps) {
  const { isLoggedIn } = useAuth();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) return;
    apiFetch("/api/wishlist")
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((json) => {
        const items = json.data ?? [];
        const found = items.some(
          (item: { course_id: string | { id: string } }) => {
            const cId =
              typeof item.course_id === "string"
                ? item.course_id
                : item.course_id?.id;
            return cId === courseId;
          }
        );
        setIsWishlisted(found);
      })
      .catch(() => {});
  }, [isLoggedIn, courseId]);

  if (!isLoggedIn) return null;

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      const res = await apiPost("/api/wishlist", { course_id: courseId });
      if (res.ok) {
        const json = await res.json();
        setIsWishlisted(json.action === "added");
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={cn(
        "absolute bottom-2 right-2 z-10 flex size-8 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm transition-colors hover:bg-background",
        className
      )}
      aria-label={isWishlisted ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
    >
      <Heart
        className={cn(
          "size-4 transition-colors",
          isWishlisted ? "fill-red-500 text-red-500" : "text-muted-foreground"
        )}
      />
    </button>
  );
}
