"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiPatch, apiDelete } from "@/lib/api-fetch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CheckCircle, XCircle, Trash2, Settings } from "lucide-react";

interface OrderDetailActionsProps {
  orderId: string;
  currentStatus: string;
}

export function OrderDetailActions({
  orderId,
  currentStatus,
}: OrderDetailActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAction = async (action: "confirm" | "cancel" | "delete") => {
    setLoading(true);
    try {
      if (action === "delete") {
        const res = await apiDelete(`/api/admin/orders/${orderId}`);
        if (res.ok) {
          toast.success("Đã xoá đơn hàng");
          router.push("/admin/orders");
        } else {
          toast.error("Không thể xoá đơn hàng");
        }
      } else {
        const newStatus = action === "confirm" ? "success" : "cancelled";
        const res = await apiPatch(`/api/admin/orders/${orderId}`, {
          status: newStatus,
        });
        if (res.ok) {
          toast.success(
            action === "confirm"
              ? "Đã xác nhận thanh toán"
              : "Đã huỷ đơn hàng"
          );
          router.refresh();
        } else {
          toast.error("Không thể cập nhật đơn hàng");
        }
      }
    } catch {
      toast.error("Lỗi hệ thống");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Hành động
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {currentStatus === "pending" && (
          <>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="w-full" disabled={loading}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Xác nhận thanh toán
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Xác nhận thanh toán?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Đơn hàng sẽ được chuyển sang trạng thái thành công và tự
                    động tạo enrollment cho học viên.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Huỷ</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleAction("confirm")}>
                    Xác nhận
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Huỷ đơn hàng
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Huỷ đơn hàng?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Đơn hàng sẽ bị huỷ. Hành động này không thể hoàn tác.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Quay lại</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleAction("cancel")}>
                    Huỷ đơn
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              className="w-full"
              disabled={loading}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Xoá đơn hàng
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xoá đơn hàng?</AlertDialogTitle>
              <AlertDialogDescription>
                Đơn hàng sẽ bị xoá vĩnh viễn. Hành động này không thể hoàn
                tác.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Quay lại</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleAction("delete")}>
                Xoá
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
