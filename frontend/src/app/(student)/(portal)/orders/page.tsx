"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api-fetch";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Receipt, Package, ChevronRight } from "lucide-react";
import type { Order, OrderItem, Course } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
}

const statusLabels: Record<string, string> = {
  pending: "Chờ thanh toán",
  success: "Thành công",
  failed: "Thất bại",
  cancelled: "Đã huỷ",
};

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  success: "default",
  failed: "destructive",
  cancelled: "secondary",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/orders")
      .then((r) => r.json())
      .then((d) => setOrders(d.data ?? []))
      .catch(() => toast.error("Không thể tải đơn hàng"))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Receipt className="size-6" />
          Lịch sử đơn hàng
        </h1>
        <p className="text-muted-foreground">{orders.length} đơn hàng</p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="size-12 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-semibold">Chưa có đơn hàng</h3>
            <Link href="/courses" className="mt-4">
              <Button>Khám phá khoá học</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">
                        {order.order_number}
                      </span>
                      <Badge variant={statusVariants[order.status] || "outline"}>
                        {statusLabels[order.status] || order.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(order.date_created), {
                        addSuffix: true,
                        locale: vi,
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      {formatPrice(order.total_amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(order.items as OrderItem[])?.length ?? 0} khoá học
                    </p>
                  </div>
                </div>

                {order.items && (order.items as OrderItem[]).length > 0 && (
                  <div className="mt-3 pt-3 border-t space-y-1">
                    {(order.items as OrderItem[]).map((item) => {
                      const course =
                        typeof item.course_id === "object"
                          ? (item.course_id as Course)
                          : null;
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-muted-foreground truncate">
                            {course?.title || "Khoá học"}
                          </span>
                          <span>{formatPrice(item.price)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                  <div className="flex gap-2">
                    {order.status === "pending" && (
                      <Link href={`/mock-payment/${order.id}`}>
                        <Button size="sm">Thanh toán ngay</Button>
                      </Link>
                    )}
                  </div>
                  <Link href={`/orders/${order.id}`}>
                    <Button variant="ghost" size="sm">
                      Chi tiết
                      <ChevronRight className="ml-1 size-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
