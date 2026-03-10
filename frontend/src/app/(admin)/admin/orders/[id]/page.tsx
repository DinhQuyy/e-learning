import { requireAuth } from "@/lib/dal";
import { directusFetch } from "@/lib/directus-fetch";
import { getAssetUrl } from "@/lib/directus";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Package,
  User,
  CreditCard,
  Calendar,
  Hash,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderDetailActions } from "./order-detail-actions";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chi tiết đơn hàng - Quản trị",
};

const priceFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

function getStatusBadge(status: string) {
  switch (status) {
    case "success":
      return <Badge className="bg-green-100 text-green-700">Thành công</Badge>;
    case "pending":
      return (
        <Badge className="bg-yellow-100 text-yellow-700">Chờ xử lý</Badge>
      );
    case "failed":
      return <Badge className="bg-red-100 text-red-700">Thất bại</Badge>;
    case "cancelled":
      return <Badge className="bg-gray-100 text-gray-700">Đã huỷ</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getPaymentMethodLabel(method: string) {
  switch (method) {
    case "vnpay":
      return "VNPay";
    case "momo":
      return "MoMo";
    case "bank_transfer":
      return "Chuyển khoản ngân hàng";
    default:
      return method;
  }
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAuth();

  const res = await directusFetch(
    `/items/orders/${id}?fields=*,user_id.id,user_id.first_name,user_id.last_name,user_id.email,user_id.avatar,user_id.phone,items.id,items.price,items.course_id.id,items.course_id.title,items.course_id.slug,items.course_id.thumbnail`
  );

  if (!res.ok) {
    notFound();
  }

  const data = await res.json();
  const order = data.data;

  if (!order) {
    notFound();
  }

  const user = order.user_id;
  const userName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ") ||
      user.email
    : "N/A";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/orders">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Đơn hàng #{order.order_number}
            </h1>
            {getStatusBadge(order.status)}
          </div>
          <p className="text-sm text-gray-500">
            Tạo lúc{" "}
            {format(new Date(order.date_created), "HH:mm dd/MM/yyyy", {
              locale: vi,
            })}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content — 2 cols */}
        <div className="space-y-6 lg:col-span-2">
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Sản phẩm ({order.items?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Khoá học</TableHead>
                    <TableHead className="text-right">Giá</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(order.items ?? []).map(
                    (item: {
                      id: string;
                      price: number;
                      course_id: {
                        id: string;
                        title: string;
                        slug: string;
                        thumbnail: string | null;
                      } | null;
                    }) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {item.course_id?.thumbnail && (
                              <img
                                src={getAssetUrl(item.course_id.thumbnail) ?? ""}
                                alt=""
                                className="h-10 w-16 rounded object-cover"
                              />
                            )}
                            <span className="font-medium">
                              {item.course_id?.title ?? "Khoá học đã xoá"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {priceFormatter.format(item.price)}
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>

              <Separator className="my-4" />

              <div className="flex items-center justify-between text-lg font-bold">
                <span>Tổng cộng</span>
                <span>{priceFormatter.format(order.total_amount)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Order Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Lịch sử đơn hàng
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Đơn hàng được tạo</p>
                    <p className="text-xs text-gray-500">
                      {format(
                        new Date(order.date_created),
                        "HH:mm dd/MM/yyyy",
                        { locale: vi }
                      )}
                    </p>
                  </div>
                </div>

                {order.paid_at && (
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-green-500" />
                    <div>
                      <p className="text-sm font-medium">
                        Thanh toán thành công
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(
                          new Date(order.paid_at),
                          "HH:mm dd/MM/yyyy",
                          { locale: vi }
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {order.status === "cancelled" && (
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-red-500" />
                    <div>
                      <p className="text-sm font-medium">Đơn hàng đã huỷ</p>
                    </div>
                  </div>
                )}

                {order.status === "failed" && (
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-red-500" />
                    <div>
                      <p className="text-sm font-medium">
                        Thanh toán thất bại
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar — 1 col */}
        <div className="space-y-6">
          {/* Actions */}
          <OrderDetailActions
            orderId={order.id}
            currentStatus={order.status}
          />

          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Khách hàng
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {user ? (
                <>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={getAssetUrl(user.avatar)}
                        alt={userName}
                      />
                      <AvatarFallback>
                        {userName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{userName}</p>
                      <p className="text-sm text-gray-500">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  {user.phone && (
                    <p className="text-sm text-gray-500">
                      SĐT: {user.phone}
                    </p>
                  )}
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href={`/admin/users/${user.id}`}>
                      Xem hồ sơ
                    </Link>
                  </Button>
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  Không có thông tin khách hàng
                </p>
              )}
            </CardContent>
          </Card>

          {/* Payment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Thanh toán
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Phương thức</span>
                <span className="font-medium">
                  {getPaymentMethodLabel(order.payment_method)}
                </span>
              </div>
              {order.payment_ref && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Mã giao dịch</span>
                  <span className="font-mono text-xs">{order.payment_ref}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Trạng thái</span>
                {getStatusBadge(order.status)}
              </div>
            </CardContent>
          </Card>

          {/* Order ID */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Thông tin
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Mã đơn</span>
                <span className="font-mono text-xs">
                  {order.order_number}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">ID</span>
                <span className="font-mono text-xs">{order.id}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
