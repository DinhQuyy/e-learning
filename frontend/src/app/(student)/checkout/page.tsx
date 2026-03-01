"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, apiPost } from "@/lib/api-fetch";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, Loader2 } from "lucide-react";
import type { Course } from "@/types";

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
  if (course.discount_price !== null && course.discount_price < course.price) {
    return course.discount_price;
  }
  return course.price;
}

const paymentMethods = [
  { value: "vnpay", label: "VNPay", description: "Thanh toán qua VNPay" },
  { value: "momo", label: "MoMo", description: "Thanh toán qua ví MoMo" },
  {
    value: "bank_transfer",
    label: "Chuyển khoản ngân hàng",
    description: "Chuyển khoản qua mã QR",
  },
];

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

  const totalPrice = items.reduce((sum, item) => {
    const course = item.course_id as Course;
    if (!course || typeof course === "string") return sum;
    return sum + getCoursePrice(course);
  }, 0);

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
      toast.error(
        error instanceof Error ? error.message : "Đã có lỗi xảy ra"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <CreditCard className="size-6" />
          Thanh toán
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Đơn hàng ({items.length} khoá học)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item) => {
                const course = item.course_id as Course;
                if (!course || typeof course === "string") return null;
                const price = getCoursePrice(course);

                return (
                  <div key={item.id} className="flex gap-3 items-center">
                    <div className="relative size-14 shrink-0 rounded overflow-hidden">
                      <Image
                        src={
                          course.thumbnail
                            ? `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/assets/${course.thumbnail}`
                            : "/placeholder.svg"
                        }
                        alt={course.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {course.title}
                      </p>
                    </div>
                    <span className="font-semibold text-sm shrink-0">
                      {price === 0 ? "Miễn phí" : formatPrice(price)}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle>Phương thức thanh toán</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={paymentMethod}
                onValueChange={setPaymentMethod}
                className="space-y-3"
              >
                {paymentMethods.map((method) => (
                  <div
                    key={method.value}
                    className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50"
                    onClick={() => setPaymentMethod(method.value)}
                  >
                    <RadioGroupItem value={method.value} id={method.value} />
                    <Label
                      htmlFor={method.value}
                      className="cursor-pointer flex-1"
                    >
                      <p className="font-medium">{method.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {method.description}
                      </p>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        </div>

        {/* Price Summary */}
        <div>
          <Card className="sticky top-20">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-lg">Tổng thanh toán</h3>
              <Separator />
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tạm tính</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Giảm giá</span>
                  <span>0 ₫</span>
                </div>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-semibold">Tổng cộng</span>
                <span className="text-xl font-bold">
                  {totalPrice === 0 ? "Miễn phí" : formatPrice(totalPrice)}
                </span>
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                {isSubmitting ? "Đang xử lý..." : "Xác nhận thanh toán"}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Bằng việc thanh toán, bạn đồng ý với điều khoản dịch vụ
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
