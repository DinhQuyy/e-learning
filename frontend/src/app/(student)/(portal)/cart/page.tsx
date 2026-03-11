"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Lock,
  ShieldCheck,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { apiDelete, apiFetch } from "@/lib/api-fetch";
import { getCourseImageSrc } from "@/lib/course-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
  if (course.discount_price !== null && course.discount_price < course.price) {
    return course.discount_price;
  }
  return course.price;
}

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/cart")
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((json: { data?: CartItemData[] }) => {
        setItems(Array.isArray(json.data) ? json.data : []);
      })
      .catch(() => toast.error("Không thể tải giỏ hàng"))
      .finally(() => setIsLoading(false));
  }, []);

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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-[#2f57ef]/20 bg-gradient-to-r from-[#eef3ff] via-background to-[#f6efff] p-6 sm:p-8">
        <div className="relative z-10">
          <p className="inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-[#2f57ef]">
            Thanh toán nhanh và an toàn
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Giỏ hàng của bạn
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Bạn đang có {items.length} khóa học trong giỏ hàng.
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-accent p-4">
              <BookOpen className="size-8 text-muted-foreground" />
            </div>
            <h2 className="mt-4 text-xl font-semibold">Giỏ hàng đang trống</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Khám phá danh sách khóa học phổ biến và thêm vào giỏ hàng để bắt đầu học ngay.
            </p>
            <Link href="/courses" className="mt-5">
              <Button
                className="rounded-full border-0 px-6 text-white"
                style={{ backgroundImage: "linear-gradient(90deg, #2f57ef, #b966e7)" }}
              >
                Khám phá khóa học
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {items.map((item) => {
              const course = item.course_id as Course;
              if (!course || typeof course === "string") return null;

              const finalPrice = getCoursePrice(course);
              const hasDiscount =
                course.discount_price !== null && course.discount_price < course.price;

              return (
                <Card key={item.id} className="rounded-2xl border-border/70">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:h-24 sm:w-40">
                        <Image
                          src={getCourseImageSrc(course)}
                          alt={course.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, 160px"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/courses/${course.slug}`}
                          className="line-clamp-2 text-base font-semibold transition-colors hover:text-[#2f57ef]"
                        >
                          {course.title}
                        </Link>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Cập nhật vào {new Date(item.date_created).toLocaleDateString("vi-VN")}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <span className="text-base font-bold text-[#2f57ef]">
                            {finalPrice === 0 ? "Miễn phí" : formatPrice(finalPrice)}
                          </span>
                          {hasDiscount && (
                            <span className="text-sm text-muted-foreground line-through">
                              {formatPrice(course.price)}
                            </span>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-destructive"
                        onClick={() => handleRemove(item.id)}
                        disabled={removingId === item.id}
                        aria-label="Xóa khóa học"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div>
            <Card className="sticky top-24 rounded-2xl border-border/70">
              <CardContent className="space-y-5 p-6">
                <h3 className="text-lg font-semibold">Tổng đơn hàng</h3>
                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Số khóa học</span>
                    <span className="font-medium text-foreground">{items.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Tạm tính</span>
                    <span className="font-medium text-foreground">
                      {totalPrice === 0 ? "Miễn phí" : formatPrice(totalPrice)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-semibold">
                    <span>Thành tiền</span>
                    <span className="text-lg text-[#2f57ef]">
                      {totalPrice === 0 ? "Miễn phí" : formatPrice(totalPrice)}
                    </span>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full rounded-full border-0 text-white"
                  style={{ backgroundImage: "linear-gradient(90deg, #2f57ef, #b966e7)" }}
                  onClick={() => router.push("/checkout")}
                >
                  Thanh toán
                  <ArrowRight className="size-4" />
                </Button>

                <Button
                  variant="outline"
                  className="w-full rounded-full"
                  onClick={() => router.push("/courses")}
                >
                  Tiếp tục xem khóa học
                </Button>

                <div className="rounded-xl bg-accent/60 p-3">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <ShieldCheck className="size-4 text-emerald-600" />
                    Cam kết giao dịch an toàn
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Lock className="size-3.5" />
                    Dữ liệu thanh toán được mã hóa trong suốt quá trình.
                  </p>
                </div>

                <div className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
                  <p className="flex items-center gap-2 font-semibold text-foreground">
                    <ShoppingBag className="size-3.5" />
                    Mẹo nhỏ
                  </p>
                  <p className="mt-1">
                    Bạn có thể thêm vào wishlist nếu chưa sẵn sàng thanh toán ngay.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
