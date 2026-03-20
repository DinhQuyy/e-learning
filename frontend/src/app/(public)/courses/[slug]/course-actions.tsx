"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, Heart, Zap, PlayCircle, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch, apiPost } from "@/lib/api-fetch";
import { cn } from "@/lib/utils";

interface CourseActionsProps {
  courseId: string;
  courseSlug: string;
  price: number;
  discountPrice: number | null;
  initialIsEnrolled?: boolean;
}

export function CourseActions({
  courseId,
  courseSlug,
  price,
  discountPrice,
  initialIsEnrolled = false,
}: CourseActionsProps) {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [isEnrolled, setIsEnrolled] = useState(initialIsEnrolled);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [inCart, setInCart] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(isLoggedIn && !initialIsEnrolled);

  const effectivePrice =
    discountPrice !== null && discountPrice < price ? discountPrice : price;
  const isFree = effectivePrice === 0;

  useEffect(() => {
    let cancelled = false;

    const refreshStatus = async () => {
      if (initialIsEnrolled) {
        if (!cancelled) {
          setIsEnrolled(true);
          setInCart(false);
          setChecking(false);
        }
        return;
      }

      if (!isLoggedIn) {
        if (!cancelled) {
          setIsEnrolled(false);
          setIsWishlisted(false);
          setInCart(false);
          setChecking(false);
        }
        return;
      }

      if (!cancelled) {
        setChecking(true);
      }

      try {
        const [enrollments, cart, wishlist] = await Promise.all([
          apiFetch("/api/enrollments", { cache: "no-store" }).then((response) =>
            response.ok ? response.json() : { data: [] }
          ),
          apiFetch("/api/cart", { cache: "no-store" }).then((response) =>
            response.ok ? response.json() : { data: [] }
          ),
          apiFetch("/api/wishlist", { cache: "no-store" }).then((response) =>
            response.ok ? response.json() : { data: [] }
          ),
        ]);

        if (cancelled) return;

        const enrolled = (enrollments.data ?? []).some(
          (enrollment: { course_id: string | { id: string } }) => {
            const targetCourseId =
              typeof enrollment.course_id === "string"
                ? enrollment.course_id
                : enrollment.course_id?.id;
            return targetCourseId === courseId;
          }
        );
        setIsEnrolled(enrolled);

        const cartItem = (cart.data ?? []).some(
          (item: { course_id: string | { id: string } }) => {
            const targetCourseId =
              typeof item.course_id === "string"
                ? item.course_id
                : item.course_id?.id;
            return targetCourseId === courseId;
          }
        );
        setInCart(cartItem);

        const wishlisted = (wishlist.data ?? []).some(
          (item: { course_id: string | { id: string } }) => {
            const targetCourseId =
              typeof item.course_id === "string"
                ? item.course_id
                : item.course_id?.id;
            return targetCourseId === courseId;
          }
        );
        setIsWishlisted(wishlisted);
      } catch {
        // Ignore transient refresh failures; next focus/pageshow will try again.
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    };

    const handlePageShow = () => {
      void refreshStatus();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshStatus();
      }
    };

    const handleFocus = () => {
      void refreshStatus();
    };

    void refreshStatus();
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [courseId, initialIsEnrolled, isLoggedIn]);

  const handleAddToCart = async () => {
    setLoading(true);
    try {
      const res = await apiPost("/api/cart", { course_id: courseId });
      if (res.ok) {
        setInCart(true);
        toast.success("Đã thêm vào giỏ hàng");
      } else {
        const err = await res.json();
        toast.error(err.error || "Không thể thêm vào giỏ hàng");
      }
    } catch {
      toast.error("Lỗi hệ thống");
    } finally {
      setLoading(false);
    }
  };

  const handleBuyNow = async () => {
    setLoading(true);
    try {
      if (!inCart) {
        const cartRes = await apiPost("/api/cart", { course_id: courseId });
        if (!cartRes.ok) {
          const err = await cartRes.json();
          toast.error(err.error || "Không thể mua ngay");
          return;
        }
      }

      router.push("/checkout");
    } catch {
      toast.error("Lỗi hệ thống");
    } finally {
      setLoading(false);
    }
  };

  const handleFreeEnroll = async () => {
    setLoading(true);
    try {
      const res = await apiPost("/api/enrollments", { course_id: courseId });
      if (res.ok) {
        setIsEnrolled(true);
        toast.success("Đăng ký thành công!");
        router.refresh();
      } else {
        const err = await res.json();
        if (res.status === 409) {
          setIsEnrolled(true);
        }
        toast.error(err.error || "Không thể đăng ký");
      }
    } catch {
      toast.error("Lỗi hệ thống");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleWishlist = async () => {
    try {
      const res = await apiPost("/api/wishlist", { course_id: courseId });
      if (res.ok) {
        const json = await res.json();
        const added = !json.removed;
        setIsWishlisted(added);
        toast.success(
          added ? "Đã thêm vào yêu thích" : "Đã bỏ yêu thích"
        );
      }
    } catch {
      // Ignore wishlist failures to avoid blocking the main purchase flow.
    }
  };

  if (checking) {
    return (
      <div className="space-y-3">
        <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
      </div>
    );
  }

  if (isEnrolled) {
    return (
      <Button className="w-full" size="lg" asChild>
        <Link href={`/learn/${courseSlug}`}>
          <PlayCircle className="size-4" />
          Tiếp tục học
        </Link>
      </Button>
    );
  }

  if (!isLoggedIn) {
    return (
      <Button className="w-full" size="lg" asChild>
        <Link href={`/login?redirect=/courses/${courseSlug}`}>
          <LogIn className="size-4" />
          Đăng nhập để mua
        </Link>
      </Button>
    );
  }

  if (isFree) {
    return (
      <div className="space-y-3">
        <Button
          className="w-full"
          size="lg"
          onClick={handleFreeEnroll}
          disabled={loading}
        >
          <Zap className="size-4" />
          Đăng ký miễn phí
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleToggleWishlist}
        >
          <Heart
            className={cn(
              "size-4",
              isWishlisted && "fill-red-500 text-red-500"
            )}
          />
          {isWishlisted ? "Đã yêu thích" : "Thêm vào yêu thích"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {inCart ? (
        <Button className="w-full" size="lg" asChild>
          <Link href="/cart">
            <ShoppingCart className="size-4" />
            Xem giỏ hàng
          </Link>
        </Button>
      ) : (
        <Button
          className="w-full"
          size="lg"
          onClick={handleAddToCart}
          disabled={loading}
        >
          <ShoppingCart className="size-4" />
          Thêm vào giỏ hàng
        </Button>
      )}

      <Button
        variant="outline"
        className="w-full"
        size="lg"
        onClick={handleBuyNow}
        disabled={loading}
      >
        <Zap className="size-4" />
        Mua ngay
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="w-full"
        onClick={handleToggleWishlist}
      >
        <Heart
          className={cn(
            "size-4",
            isWishlisted && "fill-red-500 text-red-500"
          )}
        />
        {isWishlisted ? "Đã yêu thích" : "Thêm vào yêu thích"}
      </Button>
    </div>
  );
}
