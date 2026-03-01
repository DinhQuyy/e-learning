"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, ArrowRight, BookOpen } from "lucide-react";

export default function CheckoutSuccessPage() {
  const params = useParams();
  const orderId = params.orderId as string;

  return (
    <div className="max-w-lg mx-auto py-12">
      <Card>
        <CardContent className="flex flex-col items-center text-center p-8 space-y-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 className="size-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold">Thanh toán thành công!</h1>
          <p className="text-muted-foreground">
            Đơn hàng của bạn đã được xử lý thành công. Bạn có thể bắt đầu học
            ngay bây giờ.
          </p>
          <p className="text-xs text-muted-foreground">
            Mã đơn hàng: {orderId}
          </p>
          <div className="flex flex-col gap-2 w-full pt-4">
            <Link href="/my-courses">
              <Button className="w-full">
                <BookOpen className="mr-2 size-4" />
                Khoá học của tôi
              </Button>
            </Link>
            <Link href="/courses">
              <Button variant="outline" className="w-full">
                Tiếp tục mua sắm
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
