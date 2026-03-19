"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { apiFetch, apiPost } from "@/lib/api-fetch";
import { getCourseImageSrc } from "@/lib/course-image";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, ChevronRight, Loader2, Lock, ShoppingCart } from "lucide-react";
import type { Course } from "@/types";

function VNPayLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#0065AC"/>
      <text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle"
        fill="white" fontSize="11" fontWeight="800" fontFamily="Arial, sans-serif"
        letterSpacing="-0.5">
        VNPay
      </text>
    </svg>
  );
}

function MoMoLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#AE2070"/>
      <circle cx="14" cy="20" r="5" fill="white"/>
      <circle cx="26" cy="20" r="5" fill="white"/>
      <circle cx="14" cy="20" r="2.5" fill="#AE2070"/>
      <circle cx="26" cy="20" r="2.5" fill="#AE2070"/>
    </svg>
  );
}

function BankLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#059669"/>
      <polygon points="20,8 33,15 7,15" fill="white"/>
      <rect x="10" y="16" width="3" height="11" fill="white"/>
      <rect x="18.5" y="16" width="3" height="11" fill="white"/>
      <rect x="27" y="16" width="3" height="11" fill="white"/>
      <rect x="7" y="28" width="26" height="3" rx="1" fill="white"/>
    </svg>
  );
}

interface CartItemData {
  id: string;
  course_id: Course;
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

const paymentMethods = [
  {
    value: "vnpay",
    label: "VNPay",
    desc: "Thẻ ATM, Visa, QR VNPay",
    activeBorder: "border-[#0065AC] bg-blue-50/50",
    Logo: VNPayLogo,
  },
  {
    value: "momo",
    label: "Ví MoMo",
    desc: "Ví điện tử MoMo",
    activeBorder: "border-[#AE2070] bg-pink-50/50",
    Logo: MoMoLogo,
  },
  {
    value: "bank_transfer",
    label: "Chuyển khoản ngân hàng",
    desc: "QR Code Internet Banking",
    activeBorder: "border-emerald-500 bg-emerald-50/50",
    Logo: BankLogo,
  },
];

function ProgressBreadcrumb({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { label: "Giỏ hàng", href: "/cart" },
    { label: "Thanh toán", href: null },
    { label: "Hoàn tất", href: null },
  ];
  return (
    <div className="flex items-center gap-2 text-sm">
      {steps.map((s, i) => {
        const idx = i + 1;
        const isActive = idx === step;
        const isDone = idx < step;
        return (
          <span key={s.label} className="flex items-center gap-2">
            {i > 0 && <ChevronRight className="size-4 text-slate-300" />}
            {isDone && s.href ? (
              <Link
                href={s.href}
                className="font-medium text-[#2f57ef] hover:underline"
              >
                {s.label}
              </Link>
            ) : (
              <span
                className={cn(
                  "font-medium",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {s.label}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("vnpay");

  useEffect(() => {
    apiFetch("/api/cart")
      .then((r) => r.json())
      .then((d) => {
        const data = d.data ?? [];
        if (data.length === 0) {
          router.push("/cart");
          return;
        }
        setItems(data);
      })
      .catch(() => toast.error("Không thể tải giỏ hàng"))
      .finally(() => setIsLoading(false));
  }, [router]);

  const courses = items
    .map((item) => item.course_id as Course)
    .filter((c) => c && typeof c !== "string");

  const originalTotal = courses.reduce((sum, c) => sum + Number(c.price ?? 0), 0);
  const totalPrice = courses.reduce((sum, c) => sum + getCoursePrice(c), 0);
  const savings = originalTotal - totalPrice;

  const handleCheckout = async () => {
    setIsSubmitting(true);
    try {
      const res = await apiPost("/api/orders", { payment_method: paymentMethod });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Không thể tạo đơn hàng");
      }
      const data = await res.json();
      router.push(`/mock-payment/${data.data.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Đã có lỗi xảy ra");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Skeleton className="mb-6 h-5 w-56" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Skeleton className="h-72 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 pt-8">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Progress */}
        <div className="mb-8">
          <ProgressBreadcrumb step={2} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: order + payment */}
          <div className="space-y-5 lg:col-span-2">
            {/* Order Summary */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-6 py-4">
                <h2 className="font-semibold text-foreground">
                  Đơn hàng ({items.length} khoá học)
                </h2>
              </div>
              <div className="divide-y divide-slate-100">
                {items.map((item) => {
                  const course = item.course_id as Course;
                  if (!course || typeof course === "string") return null;
                  const price = getCoursePrice(course);
                  const hasDiscount = price < course.price;
                  return (
                    <div key={item.id} className="flex items-center gap-4 px-6 py-4">
                      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl">
                        <Image
                          src={getCourseImageSrc(course)}
                          alt={course.title}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {course.title}
                        </p>
                        {hasDiscount && (
                          <p className="mt-0.5 text-xs text-muted-foreground line-through">
                            {formatPrice(course.price)}
                          </p>
                        )}
                      </div>
                      <span
                        className={cn(
                          "shrink-0 text-sm font-bold",
                          price === 0 ? "text-emerald-600" : "text-foreground"
                        )}
                      >
                        {formatPrice(price)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment Method */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-6 py-4">
                <h2 className="font-semibold text-foreground">Phương thức thanh toán</h2>
              </div>
              <div className="space-y-3 p-5">
                {paymentMethods.map((method) => {
                  const { Logo } = method;
                  const isActive = paymentMethod === method.value;
                  return (
                    <button
                      key={method.value}
                      onClick={() => setPaymentMethod(method.value)}
                      className={cn(
                        "flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all",
                        isActive
                          ? method.activeBorder
                          : "border-border hover:border-border/80 hover:bg-accent"
                      )}
                    >
                      <div className="shrink-0">
                        <Logo size={36} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">
                          {method.label}
                        </p>
                        <p className="text-xs text-muted-foreground">{method.desc}</p>
                      </div>
                      <div
                        className={cn(
                          "size-5 rounded-full border-2 transition-all",
                          isActive
                            ? "border-[#2f57ef] bg-[#2f57ef]"
                            : "border-slate-300"
                        )}
                      >
                        {isActive && (
                          <CheckCircle className="size-full text-white" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: price summary */}
          <div>
            <div className="sticky top-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-6 py-4">
                <h2 className="font-semibold text-foreground">Tổng thanh toán</h2>
              </div>
              <div className="space-y-4 p-6">
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tạm tính</span>
                    <span className="text-foreground">{formatPrice(originalTotal)}</span>
                  </div>
                  {savings > 0 && (
                    <div className="flex justify-between">
                      <span className="text-emerald-600">Giảm giá</span>
                      <span className="font-medium text-emerald-600">
                        -{formatPrice(savings)}
                      </span>
                    </div>
                  )}
                </div>
                <Separator />
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold text-foreground">Tổng cộng</span>
                  <span
                    className={cn(
                      "text-2xl font-bold",
                      totalPrice === 0 ? "text-emerald-600" : "text-[#2f57ef]"
                    )}
                  >
                    {formatPrice(totalPrice)}
                  </span>
                </div>

                <Button
                  className="h-12 w-full rounded-xl text-sm font-semibold"
                  style={{
                    background: isSubmitting
                      ? undefined
                      : "linear-gradient(90deg, #2f57ef, #b966e7)",
                    border: 0,
                  }}
                  onClick={handleCheckout}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : null}
                  {isSubmitting ? "Đang xử lý..." : "Xác nhận thanh toán"}
                </Button>

                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Lock className="size-3" />
                  Giao dịch được mã hoá và bảo mật
                </div>

                <p className="text-center text-xs text-muted-foreground">
                  Bằng việc thanh toán, bạn đồng ý với{" "}
                  <Link href="/terms" className="underline hover:text-slate-600">
                    điều khoản dịch vụ
                  </Link>
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShoppingCart className="size-3.5" />
              <Link href="/cart" className="hover:text-slate-600 hover:underline">
                Quay lại giỏ hàng
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
