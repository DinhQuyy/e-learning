import { Suspense } from "react";
import type { Metadata } from "next";
import { AdminOrdersClient } from "./orders-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quản lý đơn hàng - Quản trị",
};

export default function AdminOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Quản lý đơn hàng</h1>
            <p className="text-muted-foreground">Đang tải...</p>
          </div>
        </div>
      }
    >
      <AdminOrdersClient />
    </Suspense>
  );
}
