"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch, apiPost } from "@/lib/api-fetch";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, XCircle, Loader2, QrCode, CreditCard, Smartphone } from "lucide-react";
import type { Order } from "@/types";
import QRCode from "qrcode";

function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
}

export default function MockPaymentPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    apiFetch(`/api/orders/${orderId}`)
      .then((r) => r.json())
      .then((d) => {
        setOrder(d.data);
        if (d.data?.payment_method === "bank_transfer") {
          QRCode.toDataURL(`DEMO-KHOAHOC-${orderId}`, { width: 256 }).then(
            setQrDataUrl
          );
        }
      })
      .catch(() => toast.error("Không thể tải đơn hàng"))
      .finally(() => setIsLoading(false));
  }, [orderId]);

  const handlePayment = async (success: boolean) => {
    setIsProcessing(true);
    try {
      const res = await apiPost(`/api/orders/${orderId}/pay`, { success });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Đã có lỗi xảy ra");
      }

      if (success) {
        router.push(`/checkout/success/${orderId}`);
      } else {
        router.push(`/checkout/failed/${orderId}`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Đã có lỗi xảy ra"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Không tìm thấy đơn hàng</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-center">Thanh toán</h1>

      <Card>
        <CardHeader className="text-center">
          {order.payment_method === "vnpay" && (
            <>
              <CreditCard className="size-12 text-blue-600 mx-auto" />
              <CardTitle className="text-blue-600">VNPay</CardTitle>
            </>
          )}
          {order.payment_method === "momo" && (
            <>
              <Smartphone className="size-12 text-pink-500 mx-auto" />
              <CardTitle className="text-pink-500">MoMo</CardTitle>
            </>
          )}
          {order.payment_method === "bank_transfer" && (
            <>
              <QrCode className="size-12 text-green-600 mx-auto" />
              <CardTitle className="text-green-600">
                Chuyển khoản ngân hàng
              </CardTitle>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Số tiền</p>
            <p className="text-3xl font-bold">
              {formatPrice(order.total_amount)}
            </p>
            <Badge variant="outline" className="mt-2">
              Đơn hàng: {order.order_number}
            </Badge>
          </div>

          <Separator />

          {order.payment_method === "bank_transfer" && (
            <div className="space-y-4">
              <div className="flex justify-center">
                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt="QR Code"
                    className="rounded-lg"
                    width={200}
                    height={200}
                  />
                )}
              </div>
              <div className="space-y-2 text-sm bg-muted/50 rounded-lg p-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ngân hàng</span>
                  <span className="font-medium">Ngân hàng ABC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Số tài khoản</span>
                  <span className="font-medium">123456789</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nội dung CK</span>
                  <span className="font-medium font-mono">
                    DEMO-KHOAHOC-{orderId.slice(0, 8)}
                  </span>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => handlePayment(true)}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 size-4" />
                )}
                Tôi đã chuyển khoản
              </Button>
            </div>
          )}

          {order.payment_method !== "bank_transfer" && (
            <div className="space-y-3 pt-2">
              <p className="text-sm text-center text-muted-foreground">
                Đây là giao diện thanh toán giả lập
              </p>
              <Button
                className="w-full"
                onClick={() => handlePayment(true)}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 size-4" />
                )}
                Thanh toán thành công
              </Button>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => handlePayment(false)}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <XCircle className="mr-2 size-4" />
                )}
                Thanh toán thất bại
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
