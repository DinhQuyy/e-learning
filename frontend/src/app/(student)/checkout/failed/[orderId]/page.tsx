"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { XCircle, ArrowRight, RefreshCw } from "lucide-react";

export default function CheckoutFailedPage() {
  const params = useParams();
  const orderId = params.orderId as string;

  return (
    <div className="max-w-lg mx-auto py-12">
      <Card>
        <CardContent className="flex flex-col items-center text-center p-8 space-y-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <XCircle className="size-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold">Thanh toán thất bại</h1>
          <p className="text-muted-foreground">
            Đã có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại.
          </p>
          <p className="text-xs text-muted-foreground">
            Mã đơn hàng: {orderId}
          </p>
          <div className="flex flex-col gap-2 w-full pt-4">
            <Link href="/cart">
              <Button className="w-full">
                <RefreshCw className="mr-2 size-4" />
                Thử lại
              </Button>
            </Link>
            <Link href="/courses">
              <Button variant="outline" className="w-full">
                Tiếp tục xem khoá học
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
