"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { apiFetch } from "@/lib/api-fetch";
import { getCourseImageSrc } from "@/lib/course-image";
import { toast } from "sonner";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  CreditCard,
  Package,
  Printer,
  XCircle,
  AlertCircle,
  Receipt,
} from "lucide-react";
import type { Order, OrderItem, Course } from "@/types";

function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
}

const statusConfig: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: typeof CheckCircle2;
    color: string;
  }
> = {
  pending: {
    label: "Chờ thanh toán",
    variant: "outline",
    icon: Clock,
    color: "text-yellow-600",
  },
  success: {
    label: "Thành công",
    variant: "default",
    icon: CheckCircle2,
    color: "text-green-600",
  },
  failed: {
    label: "Thất bại",
    variant: "destructive",
    icon: XCircle,
    color: "text-red-600",
  },
  cancelled: {
    label: "Đã huỷ",
    variant: "secondary",
    icon: AlertCircle,
    color: "text-gray-500",
  },
};

const paymentMethodLabels: Record<string, string> = {
  vnpay: "VNPay",
  momo: "MoMo",
  bank_transfer: "Chuyển khoản ngân hàng",
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/api/orders/${id}`)
      .then((r) => r.json())
      .then((d) => setOrder(d.data ?? null))
      .catch(() => toast.error("Không thể tải chi tiết đơn hàng"))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Package className="mb-4 size-16 text-muted-foreground/30" />
        <h2 className="text-lg font-semibold">Không tìm thấy đơn hàng</h2>
        <Link href="/orders" className="mt-4">
          <Button variant="outline">
            <ArrowLeft className="mr-2 size-4" />
            Quay lại danh sách
          </Button>
        </Link>
      </div>
    );
  }

  const status = statusConfig[order.status] ?? statusConfig.pending;
  const StatusIcon = status.icon;
  const items = (order.items as OrderItem[]) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/orders">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-5" />
            </Button>
          </Link>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
              <Receipt className="size-5" />
              Đơn hàng {order.order_number}
            </h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(order.date_created), "dd/MM/yyyy 'lúc' HH:mm", {
                locale: vi,
              })}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.print()}
          className="print:hidden"
        >
          <Printer className="mr-2 size-4" />
          In hoá đơn
        </Button>
      </div>

      {/* Status Timeline */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div
              className={`flex size-12 items-center justify-center rounded-full ${
                order.status === "success"
                  ? "bg-green-100"
                  : order.status === "failed"
                    ? "bg-red-100"
                    : order.status === "cancelled"
                      ? "bg-gray-100"
                      : "bg-yellow-100"
              }`}
            >
              <StatusIcon className={`size-6 ${status.color}`} />
            </div>
            <div>
              <Badge variant={status.variant} className="text-sm">
                {status.label}
              </Badge>
              {order.paid_at && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Thanh toán lúc{" "}
                  {format(new Date(order.paid_at), "dd/MM/yyyy HH:mm", {
                    locale: vi,
                  })}
                </p>
              )}
            </div>
          </div>

          {/* Timeline Steps */}
          <div className="mt-6 flex items-center gap-2">
            <TimelineStep
              label="Tạo đơn"
              active
              completed={!!order.date_created}
            />
            <TimelineConnector
              active={
                order.status === "success" || order.status === "failed"
              }
            />
            <TimelineStep
              label="Thanh toán"
              active={order.status !== "pending"}
              completed={order.status === "success"}
              failed={order.status === "failed"}
            />
            <TimelineConnector active={order.status === "success"} />
            <TimelineStep
              label="Hoàn tất"
              active={order.status === "success"}
              completed={order.status === "success"}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Order Items */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              Khoá học ({items.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item) => {
              const course =
                typeof item.course_id === "object"
                  ? (item.course_id as Course)
                  : null;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-4 rounded-lg border p-3"
                >
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-lg">
                    <Image
                      src={getCourseImageSrc(course)}
                      alt={course?.title ?? "Khoá học"}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    {course?.slug ? (
                      <Link
                        href={`/courses/${course.slug}`}
                        className="font-semibold hover:text-primary hover:underline"
                      >
                        {course.title}
                      </Link>
                    ) : (
                      <p className="font-semibold">
                        {course?.title ?? "Khoá học"}
                      </p>
                    )}
                  </div>
                  <p className="shrink-0 font-bold">
                    {formatPrice(item.price)}
                  </p>
                </div>
              );
            })}

            <Separator />

            <div className="flex items-center justify-between text-lg font-bold">
              <span>Tổng cộng</span>
              <span className="text-primary">
                {formatPrice(order.total_amount)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Order Info Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Thông tin thanh toán</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Mã đơn hàng</span>
                <span className="font-mono font-medium">
                  {order.order_number}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Phương thức
                </span>
                <span className="flex items-center gap-1.5">
                  <CreditCard className="size-4" />
                  {paymentMethodLabels[order.payment_method] ??
                    order.payment_method}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Ngày tạo</span>
                <span>
                  {format(new Date(order.date_created), "dd/MM/yyyy", {
                    locale: vi,
                  })}
                </span>
              </div>
              {order.paid_at && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Ngày thanh toán
                    </span>
                    <span>
                      {format(new Date(order.paid_at), "dd/MM/yyyy", {
                        locale: vi,
                      })}
                    </span>
                  </div>
                </>
              )}
              {order.payment_ref && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Mã giao dịch</span>
                    <span className="font-mono text-xs">
                      {order.payment_ref}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          {order.status === "pending" && (
            <Card className="print:hidden">
              <CardContent className="p-4">
                <Link href={`/mock-payment/${order.id}`}>
                  <Button className="w-full">Thanh toán ngay</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {order.status === "success" && (
            <Card className="print:hidden">
              <CardContent className="p-4">
                <Link href="/my-courses">
                  <Button variant="outline" className="w-full">
                    Xem khoá học của tôi
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function TimelineStep({
  label,
  active,
  completed,
  failed,
}: {
  label: string;
  active: boolean;
  completed?: boolean;
  failed?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`flex size-8 items-center justify-center rounded-full border-2 text-xs font-bold ${
          failed
            ? "border-red-500 bg-red-50 text-red-600"
            : completed
              ? "border-green-500 bg-green-50 text-green-600"
              : active
                ? "border-primary bg-primary/10 text-primary"
                : "border-muted-foreground/30 bg-muted text-muted-foreground"
        }`}
      >
        {failed ? (
          <XCircle className="size-4" />
        ) : completed ? (
          <CheckCircle2 className="size-4" />
        ) : (
          <Clock className="size-4" />
        )}
      </div>
      <span
        className={`text-xs ${
          active ? "font-medium text-foreground" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function TimelineConnector({ active }: { active: boolean }) {
  return (
    <div
      className={`mb-5 h-0.5 flex-1 rounded-full ${
        active ? "bg-green-500" : "bg-muted-foreground/20"
      }`}
    />
  );
}
