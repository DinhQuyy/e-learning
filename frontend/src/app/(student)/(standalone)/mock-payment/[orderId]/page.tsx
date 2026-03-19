"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { apiFetch, apiPost } from "@/lib/api-fetch";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, ChevronRight, Loader2, ShieldCheck, X } from "lucide-react";
import type { Order } from "@/types";
import QRCode from "qrcode";

function VNPayLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#0065AC"/>
      <text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle"
        fill="white" fontSize="11" fontWeight="800" fontFamily="Arial, sans-serif"
        letterSpacing="-0.5">VNPay</text>
    </svg>
  );
}

function MoMoLogo({ size = 32 }: { size?: number }) {
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

function BankLogo({ size = 32 }: { size?: number }) {
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

function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
}

function ProgressBreadcrumb() {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="font-medium text-muted-foreground">Giỏ hàng</span>
      <ChevronRight className="size-4 text-slate-300" />
      <Link href="/checkout" className="font-medium text-[#2f57ef] hover:underline">
        Thanh toán
      </Link>
      <ChevronRight className="size-4 text-slate-300" />
      <span className="font-medium text-foreground">Hoàn tất</span>
    </div>
  );
}

const methodConfig = {
  vnpay: {
    label: "VNPay",
    desc: "Quét mã QR bằng app VNPay hoặc Mobile Banking",
    color: "#0065AC",
    bg: "bg-blue-50",
    badge: "bg-blue-100 text-blue-700",
    qrPrefix: "VNPAY",
  },
  momo: {
    label: "Ví MoMo",
    desc: "Mở app MoMo → Quét mã → Xác nhận thanh toán",
    color: "#AE2070",
    bg: "bg-pink-50",
    badge: "bg-pink-100 text-pink-700",
    qrPrefix: "MOMO",
  },
  bank_transfer: {
    label: "Chuyển khoản ngân hàng",
    desc: "Mở app ngân hàng → Quét mã QR hoặc chuyển thủ công",
    color: "#059669",
    bg: "bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-700",
    qrPrefix: "TRANSFER",
  },
} as const;

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
        const o: Order = d.data;
        setOrder(o);
        if (!o) return;
        const method = o.payment_method as string;
        const cfg = methodConfig[method as keyof typeof methodConfig];
        const prefix = cfg?.qrPrefix ?? "PAY";
        QRCode.toDataURL(`${prefix}-${orderId}-${o.total_amount}`, {
          width: 240,
          margin: 2,
          color: { dark: "#1e293b", light: "#ffffff" },
        }).then(setQrDataUrl);
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
      router.push(
        success ? `/checkout/success/${orderId}` : `/checkout/failed/${orderId}`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Đã có lỗi xảy ra");
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <Skeleton className="mb-6 h-5 w-56" />
        <Skeleton className="h-[480px] w-full rounded-2xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted-foreground">Không tìm thấy đơn hàng</p>
        <Link href="/orders" className="mt-4 inline-block text-sm text-[#2f57ef] hover:underline">
          Xem tất cả đơn hàng
        </Link>
      </div>
    );
  }

  const method = order.payment_method as string;
  const cfg = methodConfig[method as keyof typeof methodConfig] ?? {
    label: method,
    desc: "",
    color: "#2f57ef",
    bg: "bg-slate-50",
    badge: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="min-h-screen bg-background pb-16 pt-8">
      <div className="mx-auto max-w-lg px-4 sm:px-6">
        {/* Progress */}
        <div className="mb-8">
          <ProgressBreadcrumb />
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {/* Header */}
          <div
            className="px-6 py-5 text-center"
            style={{ backgroundColor: cfg.color + "10", borderBottom: `1px solid ${cfg.color}20` }}
          >
            <div className="flex justify-center">
              {method === "vnpay" && <VNPayLogo size={48} />}
              {method === "momo" && <MoMoLogo size={48} />}
              {method === "bank_transfer" && <BankLogo size={48} />}
            </div>
            <p className="mt-2.5 text-sm font-semibold" style={{ color: cfg.color }}>
              {cfg.label}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{cfg.desc}</p>
          </div>

          <div className="px-6 py-6 space-y-5">
            {/* Amount */}
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Số tiền thanh toán
              </p>
              <p className="mt-1 text-4xl font-bold tracking-tight text-foreground">
                {formatPrice(order.total_amount)}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Mã đơn:{" "}
                <span className="font-mono font-semibold text-slate-600">
                  {order.order_number}
                </span>
              </p>
            </div>

            <Separator />

            {/* QR Code */}
            <div className="flex justify-center">
              {qrDataUrl ? (
                <div className="overflow-hidden rounded-2xl border-4 border-border p-1 shadow-sm">
                  <Image
                    src={qrDataUrl}
                    alt="QR thanh toán"
                    width={200}
                    height={200}
                    unoptimized
                    className="rounded-xl"
                  />
                </div>
              ) : (
                <div className="flex size-[216px] items-center justify-center rounded-2xl bg-muted">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Bank info (for bank_transfer) */}
            {method === "bank_transfer" && (
              <div className="space-y-2 rounded-xl bg-slate-50 px-4 py-3 text-sm">
                {[
                  { label: "Ngân hàng", value: "Ngân hàng ABC (Demo)" },
                  { label: "Số tài khoản", value: "123456789" },
                  {
                    label: "Nội dung CK",
                    value: `DEMO-KHOAHOC-${orderId.slice(0, 8).toUpperCase()}`,
                    mono: true,
                  },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span
                      className={
                        row.mono
                          ? "font-mono text-xs font-semibold text-slate-700"
                          : "font-medium text-slate-700"
                      }
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground">
              {method === "bank_transfer"
                ? "Sau khi chuyển khoản, nhấn xác nhận bên dưới"
                : "Đây là giao diện thanh toán giả lập — chọn kết quả để tiếp tục"}
            </p>

            {/* Actions */}
            <div className="space-y-2.5">
              <Button
                className="h-12 w-full rounded-xl text-sm font-semibold text-white"
                style={{ background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}cc)`, border: 0 }}
                onClick={() => handlePayment(true)}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 size-4" />
                )}
                {method === "bank_transfer" ? "Tôi đã chuyển khoản" : "Xác nhận thanh toán thành công"}
              </Button>

              <Button
                variant="outline"
                className="h-11 w-full rounded-xl border-red-200 text-sm text-red-500 hover:bg-red-50 hover:text-red-600"
                onClick={() => handlePayment(false)}
                disabled={isProcessing}
              >
                <X className="mr-2 size-4" />
                Huỷ / Thanh toán thất bại
              </Button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" />
              Giao dịch được mã hoá SSL 256-bit
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
