"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
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
import { cn } from "@/lib/utils";
import type { Course } from "@/types";

interface CartItemData {
  id: string;
  course_id: Course;
  date_created: string;
}

interface EnrollmentData {
  id: string;
  course_id: { id: string } | string | null;
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

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItemData[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch("/api/cart")
        .then((r) => (r.ok ? r.json() : { data: [] }))
        .then((json: { data?: CartItemData[] }) =>
          Array.isArray(json.data) ? json.data : []
        ),
      apiFetch("/api/enrollments")
        .then((r) => (r.ok ? r.json() : { data: [] }))
        .then((json: { data?: EnrollmentData[] }) => {
          const ids = new Set<string>();
          for (const e of json.data ?? []) {
            const cid =
              typeof e.course_id === "object" && e.course_id !== null
                ? e.course_id.id
                : typeof e.course_id === "string"
                  ? e.course_id
                  : null;
            if (cid) ids.add(cid);
          }
          return ids;
        }),
    ])
      .then(([cartItems, enrolled]) => {
        setItems(cartItems);
        setEnrolledCourseIds(enrolled);
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
      toast.success("Đã xoá khỏi giỏ hàng");
    } catch {
      toast.error("Không thể xoá khóa học");
    } finally {
      setRemovingId(null);
    }
  };

  const enrolledInCart = useMemo(
    () =>
      items.filter((item) => {
        const course = item.course_id as Course;
        return course && enrolledCourseIds.has(course.id);
      }),
    [items, enrolledCourseIds]
  );

  const checkoutItems = useMemo(
    () =>
      items.filter((item) => {
        const course = item.course_id as Course;
        return course && !enrolledCourseIds.has(course.id);
      }),
    [items, enrolledCourseIds]
  );

  const totalPrice = useMemo(
    () =>
      checkoutItems.reduce((sum, item) => {
        const course = item.course_id as Course;
        if (!course || typeof course === "string") return sum;
        return sum + getCoursePrice(course);
      }, 0),
    [checkoutItems]
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Giỏ hàng của bạn
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {items.length === 0
            ? "Giỏ hàng đang trống."
            : `${items.length} khoá học${enrolledInCart.length > 0 ? `, ${enrolledInCart.length} khoá đã đăng ký` : ""}`}
        </p>
      </div>

      {items.length === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-5">
              <BookOpen className="size-10 text-muted-foreground" />
            </div>
            <h2 className="mt-5 text-xl font-semibold text-foreground">
              Giỏ hàng trống
            </h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Khám phá hàng trăm khóa học chất lượng và thêm vào giỏ để bắt đầu học ngay hôm nay.
            </p>
            <Link href="/courses" className="mt-6">
              <Button
                className="rounded-full border-0 px-7 text-white"
                style={{ backgroundImage: "linear-gradient(90deg, #2f57ef, #b966e7)" }}
              >
                Khám phá khóa học
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Course list */}
          <div className="space-y-4 lg:col-span-2">
            {/* Enrolled-in-cart warning banner */}
            {enrolledInCart.length > 0 && (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-800 dark:text-amber-300">
                    {enrolledInCart.length} khoá học bạn đã đăng ký
                  </p>
                  <p className="mt-0.5 text-amber-700 dark:text-amber-400">
                    Các khoá này sẽ không được tính vào đơn hàng. Bạn có thể xoá chúng khỏi giỏ.
                  </p>
                </div>
              </div>
            )}

            {items.map((item) => {
              const course = item.course_id as Course;
              if (!course || typeof course === "string") return null;

              const isEnrolled = enrolledCourseIds.has(course.id);
              const finalPrice = getCoursePrice(course);
              const hasDiscount =
                course.discount_price !== null &&
                Number(course.discount_price) < Number(course.price ?? 0);

              return (
                <Card
                  key={item.id}
                  className={cn(
                    "rounded-2xl border bg-card shadow-sm transition-opacity",
                    isEnrolled ? "border-amber-200 dark:border-amber-800 opacity-70" : "border-border"
                  )}
                >
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
                        {isEnrolled && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <CheckCircle2 className="size-8 text-white drop-shadow" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <Link
                            href={`/courses/${course.slug}`}
                            className="line-clamp-2 text-base font-semibold text-foreground transition-colors hover:text-[#2f57ef]"
                          >
                            {course.title}
                          </Link>
                        </div>

                        <p className="mt-1 text-xs text-muted-foreground">
                          Thêm vào {new Date(item.date_created).toLocaleDateString("vi-VN")}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          {isEnrolled ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                              <CheckCircle2 className="size-3" />
                              Đã đăng ký
                            </span>
                          ) : (
                            <>
                              <span className="text-base font-bold text-[#2f57ef]">
                                {formatPrice(finalPrice)}
                              </span>
                              {hasDiscount && (
                                <>
                                  <span className="text-sm text-slate-400 line-through">
                                    {formatPrice(Number(course.price))}
                                  </span>
                                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-500">
                                    Giảm giá
                                  </span>
                                </>
                              )}
                            </>
                          )}
                        </div>

                        {isEnrolled && (
                          <Link
                            href={`/learn/${course.slug}`}
                            className="mt-2 inline-block text-xs font-medium text-[#2f57ef] hover:underline"
                          >
                            Vào học ngay →
                          </Link>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-slate-400 hover:text-red-500"
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

          {/* Order summary */}
          <div>
            <Card className="sticky top-24 rounded-2xl border-border bg-card shadow-sm">
              <CardContent className="space-y-5 p-6">
                <h3 className="text-lg font-bold text-foreground">Tổng đơn hàng</h3>
                <Separator />

                <div className="space-y-2.5 text-sm">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Khoá học mua mới</span>
                    <span className="font-medium text-foreground">
                      {checkoutItems.length}
                    </span>
                  </div>
                  {enrolledInCart.length > 0 && (
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Đã đăng ký (bỏ qua)</span>
                      <span>{enrolledInCart.length}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-foreground">Thành tiền</span>
                    <span className="text-xl text-[#2f57ef]">
                      {formatPrice(totalPrice)}
                    </span>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full rounded-full border-0 font-semibold text-white"
                  style={{ backgroundImage: "linear-gradient(90deg, #2f57ef, #b966e7)" }}
                  disabled={checkoutItems.length === 0}
                  onClick={() => router.push("/checkout")}
                >
                  {checkoutItems.length === 0 ? "Không có khoá để thanh toán" : "Tiến hành thanh toán"}
                  {checkoutItems.length > 0 && <ArrowRight className="size-4" />}
                </Button>

                <Button
                  variant="outline"
                  className="w-full rounded-full border-slate-200 text-slate-600"
                  onClick={() => router.push("/courses")}
                >
                  Tiếp tục xem khóa học
                </Button>

                <div className="rounded-xl bg-emerald-50 p-3">
                  <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                    <ShieldCheck className="size-4" />
                    Giao dịch an toàn & bảo mật
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-xs text-emerald-600">
                    <Lock className="size-3.5" />
                    Dữ liệu thanh toán được mã hóa end-to-end.
                  </p>
                </div>

                <div className="rounded-xl border border-dashed border-slate-200 p-3 text-xs text-slate-400">
                  <p className="flex items-center gap-2 font-semibold text-slate-600">
                    <ShoppingBag className="size-3.5" />
                    Mẹo nhỏ
                  </p>
                  <p className="mt-1">
                    Chưa sẵn sàng mua? Thêm vào danh sách yêu thích để không bỏ lỡ khi có ưu đãi.
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
