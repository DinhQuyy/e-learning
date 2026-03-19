"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Loader2, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiDelete, apiFetch } from "@/lib/api-fetch";
import { getCourseImageSrc } from "@/lib/course-image";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import type { Course } from "@/types";

interface CartItemData {
  id: string;
  course_id: Course;
  date_created: string;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
}

function getCoursePrice(course: Course): number {
  const price = Number(course.price ?? 0);
  const dp =
    course.discount_price !== null && course.discount_price !== undefined
      ? Number(course.discount_price)
      : null;
  if (dp !== null && dp >= 0 && dp < price) return dp;
  return price;
}

export function HeaderCartSheet() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CartItemData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadCart = useCallback(async () => {
    try {
      const res = await apiFetch("/api/cart");
      if (!res.ok) throw new Error();
      const json = (await res.json()) as { data?: CartItemData[] };
      setItems(Array.isArray(json.data) ? json.data : []);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    loadCart();
  }, [mounted, loadCart]);

  useEffect(() => {
    if (!mounted) return;
    if (!open) return;

    setIsLoading(true);
    loadCart().finally(() => setIsLoading(false));
  }, [mounted, open, loadCart]);

  const handleRemove = async (itemId: string) => {
    setRemovingId(itemId);
    try {
      const res = await apiDelete(`/api/cart/${itemId}`);
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      toast.success("Đã xóa khóa học khỏi giỏ hàng");
    } catch {
      toast.error("Không thể xóa khóa học");
    } finally {
      setRemovingId(null);
    }
  };

  const totalPrice = useMemo(
    () =>
      items.reduce((sum, item) => {
        const course = item.course_id;
        if (!course || typeof course === "string") return sum;
        return sum + getCoursePrice(course);
      }, 0),
    [items]
  );

  if (!mounted) {
    return (
      <Button asChild variant="ghost" size="icon" className="relative rounded-full">
        <Link href="/cart" aria-label="Giỏ hàng">
          <ShoppingCart className="size-4" />
        </Link>
      </Button>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full" aria-label="Giỏ hàng">
          <ShoppingCart className="size-4" />
          {items.length > 0 && (
            <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {items.length > 9 ? "9+" : items.length}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full max-w-md gap-0 p-0" showCloseButton>
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle className="text-lg">Giỏ hàng của bạn</SheetTitle>
          <SheetDescription>{items.length} khóa học đã được thêm vào giỏ hàng.</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-xl bg-muted/60" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-10 text-center">
              <div className="rounded-full bg-accent p-4">
                <BookOpen className="size-7 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-base font-semibold">Giỏ hàng đang trống</h3>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Thêm khóa học yêu thích vào giỏ hàng để thanh toán nhanh hơn.
              </p>
              <SheetClose asChild>
                <Button
                  asChild
                  className="mt-4 rounded-full border-0 text-white"
                  style={{ backgroundImage: "linear-gradient(90deg, #2f57ef, #b966e7)" }}
                >
                  <Link href="/courses">
                    Khám phá khóa học
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </SheetClose>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => {
                const course = item.course_id as Course;
                if (!course || typeof course === "string") return null;

                const coursePrice = getCoursePrice(course);

                return (
                  <div key={item.id} className="rounded-xl border p-2.5">
                    <div className="flex gap-3">
                      <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                        <Image
                          src={getCourseImageSrc(course)}
                          alt={course.title}
                          fill
                          className="object-cover"
                          sizes="96px"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <SheetClose asChild>
                          <Link
                            href={`/courses/${course.slug}`}
                            className="line-clamp-2 text-sm font-semibold text-foreground hover:text-[#2f57ef]"
                          >
                            {course.title}
                          </Link>
                        </SheetClose>

                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[#2f57ef]">
                              {formatPrice(coursePrice)}
                            </span>
                            {course.discount_price !== null &&
                              Number(course.discount_price) < Number(course.price ?? 0) && (
                                <span className="text-xs text-muted-foreground line-through">
                                  {formatPrice(Number(course.price))}
                                </span>
                              )}
                          </div>

                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive"
                            onClick={() => handleRemove(item.id)}
                            disabled={removingId === item.id}
                            aria-label="Xóa khóa học"
                          >
                            {removingId === item.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <SheetFooter className="border-t px-4 py-4">
          <div className="w-full space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tổng tạm tính</span>
              <span className="text-lg font-bold">
                {formatPrice(totalPrice)}
              </span>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-2">
              <SheetClose asChild>
                <Button asChild variant="outline" className="rounded-full">
                  <Link href="/cart">Xem giỏ hàng</Link>
                </Button>
              </SheetClose>
              <SheetClose asChild>
                <Button
                  asChild
                  className="rounded-full border-0 text-white"
                  style={{ backgroundImage: "linear-gradient(90deg, #2f57ef, #b966e7)" }}
                >
                  <Link href="/checkout">Thanh toán</Link>
                </Button>
              </SheetClose>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
