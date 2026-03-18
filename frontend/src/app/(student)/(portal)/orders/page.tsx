"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api-fetch";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronRight,
  Clock,
  Package,
  Receipt,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { Order, OrderItem, Course } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
    badgeClass: string;
    icon: React.ElementType;
    iconClass: string;
  }
> = {
  pending: {
    label: "Chờ thanh toán",
    badgeClass: "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-800",
    icon: Clock,
    iconClass: "text-amber-500",
  },
  success: {
    label: "Thành công",
    badgeClass: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-800",
    icon: CheckCircle2,
    iconClass: "text-emerald-500",
  },
  failed: {
    label: "Thất bại",
    badgeClass: "bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-800",
    icon: XCircle,
    iconClass: "text-red-500",
  },
  cancelled: {
    label: "Đã huỷ",
    badgeClass: "bg-muted text-muted-foreground ring-1 ring-border",
    icon: XCircle,
    iconClass: "text-muted-foreground",
  },
};

const tabs = [
  { key: "all", label: "Tất cả" },
  { key: "pending", label: "Chờ thanh toán" },
  { key: "success", label: "Thành công" },
  { key: "failed", label: "Thất bại" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  useEffect(() => {
    apiFetch("/api/orders")
      .then((r) => r.json())
      .then((d) => setOrders(d.data ?? []))
      .catch(() => toast.error("Không thể tải đơn hàng"))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered =
    activeTab === "all"
      ? orders
      : orders.filter((o) => o.status === activeTab);

  const countByTab = (key: TabKey) =>
    key === "all" ? orders.length : orders.filter((o) => o.status === key).length;

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-10 w-full rounded-xl" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-36 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Receipt className="size-6" />
          Lịch sử đơn hàng
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {orders.length} đơn hàng
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-muted/50 p-1">
        {tabs.map((tab) => {
          const count = countByTab(tab.key);
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                activeTab === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                    activeTab === tab.key
                      ? "bg-[#2f57ef]/10 text-[#2f57ef]"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
          <Package className="size-12 text-muted-foreground/30" />
          <p className="mt-3 font-medium text-muted-foreground">
            {activeTab === "all" ? "Chưa có đơn hàng nào" : "Không có đơn nào"}
          </p>
          {activeTab === "all" && (
            <Link href="/courses" className="mt-4">
              <Button size="sm">Khám phá khoá học</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const cfg = statusConfig[order.status] ?? statusConfig.pending;
            const StatusIcon = cfg.icon;
            const items = (order.items as OrderItem[]) ?? [];
            const courses = items
              .map((item) =>
                typeof item.course_id === "object"
                  ? (item.course_id as Course)
                  : null
              )
              .filter(Boolean) as Course[];

            return (
              <div
                key={order.id}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
              >
                {/* Top row */}
                <div className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-full",
                        order.status === "success"
                          ? "bg-emerald-50 dark:bg-emerald-900/20"
                          : order.status === "failed"
                            ? "bg-red-50 dark:bg-red-900/20"
                            : order.status === "pending"
                              ? "bg-amber-50 dark:bg-amber-900/20"
                              : "bg-muted"
                      )}
                    >
                      <StatusIcon className={cn("size-4", cfg.iconClass)} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-semibold text-foreground">
                        {order.order_number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(order.date_created), {
                          addSuffix: true,
                          locale: vi,
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={cn(
                        "hidden rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-block",
                        cfg.badgeClass
                      )}
                    >
                      {cfg.label}
                    </span>
                    <div className="text-right">
                      <p className="font-bold text-foreground">
                        {order.total_amount === 0
                          ? "Miễn phí"
                          : formatPrice(order.total_amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {items.length} khoá học
                      </p>
                    </div>
                  </div>
                </div>

                {/* Course list */}
                {courses.length > 0 && (
                  <div className="border-t border-border px-5 py-3">
                    <div className="space-y-1">
                      {courses.slice(0, 2).map((course) => (
                        <p
                          key={course.id}
                          className="truncate text-xs text-muted-foreground"
                        >
                          · {course.title}
                        </p>
                      ))}
                      {courses.length > 2 && (
                        <p className="text-xs text-muted-foreground">
                          +{courses.length - 2} khoá học khác
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between border-t border-border bg-muted/30 px-5 py-3">
                  <div>
                    {order.status === "pending" && (
                      <Link href={`/mock-payment/${order.id}`}>
                        <Button size="sm" className="h-8 text-xs">
                          Thanh toán ngay
                        </Button>
                      </Link>
                    )}
                    {order.status === "failed" && (
                      <Link href={`/mock-payment/${order.id}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                        >
                          Thử lại
                        </Button>
                      </Link>
                    )}
                  </div>
                  <Link href={`/orders/${order.id}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 text-xs text-muted-foreground"
                    >
                      Chi tiết
                      <ChevronRight className="size-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
