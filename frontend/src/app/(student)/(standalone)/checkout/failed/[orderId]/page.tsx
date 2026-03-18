"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, RefreshCw, XCircle } from "lucide-react";

export default function CheckoutFailedPage() {
  const params = useParams();
  const orderId = params.orderId as string;

  return (
    <div className="min-h-screen bg-[#f6f9ff] pb-16 pt-12">
      <div className="mx-auto max-w-md px-4 sm:px-6">
        <div className="flex flex-col items-center text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-red-100">
            <XCircle className="size-10 text-red-500" />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-slate-900">Thanh toán thất bại</h1>
          <p className="mt-2 text-slate-500">
            Đã có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại hoặc chọn phương thức khác.
          </p>
          {orderId && (
            <span className="mt-3 inline-block rounded-full bg-slate-100 px-3 py-1 font-mono text-xs text-slate-500">
              Đơn hàng: {orderId.slice(0, 8).toUpperCase()}
            </span>
          )}
        </div>

        <div className="mt-8 space-y-3">
          <Button
            asChild
            className="h-12 w-full rounded-xl text-sm font-semibold"
          >
            <Link href={`/mock-payment/${orderId}`}>
              <RefreshCw className="mr-2 size-4" />
              Thử lại thanh toán
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-11 w-full rounded-xl text-sm">
            <Link href="/cart">
              Quay lại giỏ hàng
            </Link>
          </Button>
          <div className="text-center">
            <Link href="/courses" className="text-sm text-slate-400 hover:text-slate-600 hover:underline">
              Tiếp tục xem khoá học
              <ArrowRight className="ml-1 inline-block size-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
