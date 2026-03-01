"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, apiPost } from "@/lib/api-fetch";
import Link from "next/link";
import { ShoppingCart, Heart, Zap, PlayCircle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CourseActionsProps {
  courseId: string;
  courseSlug: string;
  price: number;
  discountPrice: number | null;
}

export function CourseActions({
  courseId,
  courseSlug,
  price,
  discountPrice,
}: CourseActionsProps) {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [inCart, setInCart] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const effectivePrice = discountPrice !== null && discountPrice < price ? discountPrice : price;
  const isFree = effectivePrice === 0;

  useEffect(() => {
    if (!isLoggedIn) {
      setChecking(false);
      return;
    }

    Promise.all([
      apiFetch("/api/enrollments").then((r) => r.ok ? r.json() : { data: [] }),
      apiFetch("/api/cart").then((r) => r.ok ? r.json() : { data: [] }),
      apiFetch("/api/wishlist").then((r) => r.ok ? r.json() : { data: [] }),
    ])
      .then(([enrollments, cart, wishlist]) => {
        const enrolled = (enrollments.data ?? []).some(
          (e: { course_id: string | { id: string } }) => {
            const cId = typeof e.course_id === "string" ? e.course_id : e.course_id?.id;
            return cId === courseId;
          }
        );
        setIsEnrolled(enrolled);

        const cartItem = (cart.data ?? []).some(
          (item: { course_id: string | { id: string } }) => {
            const cId = typeof item.course_id === "string" ? item.course_id : item.course_id?.id;
            return cId === courseId;
          }
        );
        setInCart(cartItem);

        const wishlisted = (wishlist.data ?? []).some(
          (item: { course_id: string | { id: string } }) => {
            const cId = typeof item.course_id === "string" ? item.course_id : item.course_id?.id;
            return cId === courseId;
          }
        );
        setIsWishlisted(wishlisted);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [isLoggedIn, courseId]);

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
      // Add to cart first if not already
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
        setIsWishlisted(json.action === "added");
        toast.success(json.action === "added" ? "Đã thêm vào yêu thích" : "Đã bỏ yêu thích");
      }
    } catch {
      // ignore
    }
  };

  if (checking) {
    return (
      <div className="space-y-3">
        <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
      </div>
    );
  }

  // Guest
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

  // Enrolled
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

  // Free course
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

  // Paid course
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
