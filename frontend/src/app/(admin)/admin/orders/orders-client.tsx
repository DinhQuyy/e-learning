"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Package,
  Eye,
  Download,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiDelete, apiFetch, apiPatch } from "@/lib/api-fetch";

interface OrderData {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  payment_method: string;
  payment_ref: string | null;
  date_created: string;
  paid_at: string | null;
  user_id: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
  items?: Array<{
    id: string;
    price: number;
    course_id: { id: string; title: string } | null;
  }>;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
}

function getStatusBadge(status: string) {
  switch (status) {
    case "success":
      return <Badge className="bg-green-100 text-green-700">Thành công</Badge>;
    case "pending":
      return <Badge className="bg-yellow-100 text-yellow-700">Chờ xử lý</Badge>;
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
      return "Chuyển khoản";
    default:
      return method;
  }
}

export function AdminOrdersClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);

  const currentPage = Math.max(1, Number(searchParams.get("page")) || 1);
  const status = searchParams.get("status") || "all";
  const totalPages = Math.ceil(totalCount / 20);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("limit", "20");
      if (status !== "all") params.set("status", status);

      const res = await apiFetch(`/api/admin/orders?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setOrders(json.data ?? []);
        setTotalCount(json.meta?.filter_count ?? json.meta?.total_count ?? 0);
      }
    } catch {
      toast.error("Không thể tải danh sách đơn hàng");
    } finally {
      setLoading(false);
    }
  }, [currentPage, status]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const buildUrl = (overrides: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(overrides).forEach(([k, v]) => {
      if (v && v !== "all") {
        params.set(k, v);
      } else {
        params.delete(k);
      }
    });
    return `/admin/orders?${params.toString()}`;
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setActionOrderId(orderId);
    try {
      const res = await apiPatch(`/api/admin/orders/${orderId}`, { status: newStatus });
      if (res.ok) {
        toast.success(
          newStatus === "success"
            ? "Đơn hàng đã được xác nhận"
            : "Đơn hàng đã bị huỷ"
        );
        await fetchOrders();
      } else {
        toast.error("Không thể cập nhật đơn hàng");
      }
    } catch {
      toast.error("Lỗi hệ thống");
    } finally {
      setActionOrderId(null);
    }
  };

  const handleDeleteOrder = async (order: OrderData) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa đơn hàng "${order.order_number}"?`)) {
      return;
    }

    setActionOrderId(order.id);
    try {
      const res = await apiDelete(`/api/admin/orders/${order.id}`);
      if (!res.ok) {
        const error = await res.json().catch(() => null);
        toast.error(error?.error ?? "Không thể xóa đơn hàng");
        return;
      }

      toast.success("Đã xóa đơn hàng");

      if (orders.length === 1 && currentPage > 1) {
        router.push(buildUrl({ page: String(currentPage - 1) }));
        return;
      }

      await fetchOrders();
    } catch {
      toast.error("Lỗi hệ thống");
    } finally {
      setActionOrderId(null);
    }
  };

  const getUserName = (user: OrderData["user_id"]) => {
    if (!user) return "---";
    return (
      [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email
    );
  };

  const handleExportCSV = () => {
    if (orders.length === 0) {
      toast.error("Không có dữ liệu để xuất");
      return;
    }
    const header = "Mã đơn,Khách hàng,Email,Tổng tiền,Phương thức,Trạng thái,Ngày tạo,Ngày thanh toán\n";
    const rows = orders.map((o) => {
      const name = getUserName(o.user_id);
      const email = o.user_id?.email ?? "";
      const method = getPaymentMethodLabel(o.payment_method);
      const created = format(new Date(o.date_created), "dd/MM/yyyy HH:mm");
      const paid = o.paid_at ? format(new Date(o.paid_at), "dd/MM/yyyy HH:mm") : "";
      return `"${o.order_number}","${name}","${email}",${o.total_amount},"${method}","${o.status}","${created}","${paid}"`;
    });
    const csv = "\uFEFF" + header + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Đã xuất file CSV");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Quản lý đơn hàng</h1>
          <p className="text-gray-500">
            Tổng cộng {totalCount} đơn hàng
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/admin/orders")}
            disabled={loading}
            className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-700"
          >
            <RefreshCw className={`mr-2 h-4 w-4 transition-transform ${loading ? "animate-spin" : ""}`} />
            {loading ? "Đang tải..." : "Làm mới"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-700">
            <Download className="mr-2 h-4 w-4" />
            Xuất CSV
          </Button>
        </div>
      </div>

      {/* Status Tabs */}
      <Tabs
        value={status}
        onValueChange={(v) => router.push(buildUrl({ status: v, page: "1" }))}
      >
        <TabsList>
          <TabsTrigger value="all">Tất cả</TabsTrigger>
          <TabsTrigger value="pending">Chờ xử lý</TabsTrigger>
          <TabsTrigger value="success">Thành công</TabsTrigger>
          <TabsTrigger value="failed">Thất bại</TabsTrigger>
          <TabsTrigger value="cancelled">Đã huỷ</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-100 hover:bg-gray-100">
              <TableHead className="text-gray-700 font-semibold text-xs uppercase tracking-wider">Mã đơn</TableHead>
              <TableHead className="text-gray-700 font-semibold text-xs uppercase tracking-wider">Khách hàng</TableHead>
              <TableHead className="text-gray-700 font-semibold text-xs uppercase tracking-wider">Tổng tiền</TableHead>
              <TableHead className="text-gray-700 font-semibold text-xs uppercase tracking-wider">Phương thức</TableHead>
              <TableHead className="text-gray-700 font-semibold text-xs uppercase tracking-wider">Trạng thái</TableHead>
              <TableHead className="text-gray-700 font-semibold text-xs uppercase tracking-wider">Ngày tạo</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-gray-400">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-gray-400">
                  <Package className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                  Không có đơn hàng nào.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id} className="hover:bg-gray-50/50">
                  <TableCell className="font-mono text-sm text-gray-900">
                    {order.order_number}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {getUserName(order.user_id)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {order.user_id?.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-gray-900">
                    {formatPrice(order.total_amount)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {getPaymentMethodLabel(order.payment_method)}
                  </TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {format(new Date(order.date_created), "dd/MM/yyyy HH:mm", {
                      locale: vi,
                    })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={actionOrderId === order.id}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/orders/${order.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Xem chi tiết
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {order.status === "pending" && (
                          <>
                          <DropdownMenuItem
                            disabled={actionOrderId === order.id}
                            onClick={() =>
                              handleStatusUpdate(order.id, "success")
                            }
                          >
                            <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                            Xác nhận thanh toán
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={actionOrderId === order.id}
                            onClick={() =>
                              handleStatusUpdate(order.id, "cancelled")
                            }
                          >
                            <XCircle className="mr-2 h-4 w-4 text-red-600" />
                            Huỷ đơn
                          </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={actionOrderId === order.id}
                          onClick={() => handleDeleteOrder(order)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Xóa đơn
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Trang {currentPage} / {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-700"
              disabled={currentPage <= 1}
              onClick={() =>
                router.push(buildUrl({ page: String(currentPage - 1) }))
              }
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-700"
              disabled={currentPage >= totalPages}
              onClick={() =>
                router.push(buildUrl({ page: String(currentPage + 1) }))
              }
            >
              Sau
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
