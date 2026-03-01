"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { apiFetch, apiPatch } from "@/lib/api-fetch";

interface UserDetailActionsProps {
  userId: string;
  currentStatus: string;
  currentRoleId: string;
}

export function UserDetailActions({
  userId,
  currentStatus,
  currentRoleId,
}: UserDetailActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedRole, setSelectedRole] = useState(currentRoleId);
  const [rolesLoaded, setRolesLoaded] = useState(false);

  const loadRoles = async () => {
    if (rolesLoaded) return;
    try {
      const res = await apiFetch("/api/admin/users/roles");
      if (res.ok) {
        const json = await res.json();
        setRoles(json.data ?? []);
        setRolesLoaded(true);
      }
    } catch {
      // ignore
    }
  };

  const handleToggleStatus = async () => {
    setLoading(true);
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    try {
      const res = await apiPatch(`/api/admin/users/${userId}`, { status: newStatus });
      if (res.ok) {
        toast.success(
          newStatus === "active"
            ? "Đã kích hoạt tài khoản"
            : "Đã vô hiệu hoá tài khoản"
        );
        router.refresh();
      } else {
        toast.error("Không thể cập nhật trạng thái");
      }
    } catch {
      toast.error("Lỗi hệ thống");
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async () => {
    if (!selectedRole || selectedRole === currentRoleId) return;
    setLoading(true);
    try {
      const res = await apiPatch(`/api/admin/users/${userId}`, { role: selectedRole });
      if (res.ok) {
        toast.success("Đã cập nhật vai trò");
        router.refresh();
      } else {
        toast.error("Không thể cập nhật vai trò");
      }
    } catch {
      toast.error("Lỗi hệ thống");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Status Toggle */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant={currentStatus === "active" ? "destructive" : "default"}
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : currentStatus === "active" ? (
              <ShieldOff className="mr-2 h-4 w-4" />
            ) : (
              <ShieldCheck className="mr-2 h-4 w-4" />
            )}
            {currentStatus === "active" ? "Vô hiệu hoá" : "Kích hoạt"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {currentStatus === "active"
                ? "Vô hiệu hoá tài khoản?"
                : "Kích hoạt tài khoản?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {currentStatus === "active"
                ? "Người dùng sẽ không thể đăng nhập cho đến khi được kích hoạt lại."
                : "Người dùng sẽ có thể đăng nhập và sử dụng nền tảng."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleStatus}>
              Xác nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Role Change */}
      <div className="space-y-2">
        <Label className="text-sm">Thay đổi vai trò</Label>
        <div className="flex gap-2">
          <Select
            value={selectedRole}
            onValueChange={setSelectedRole}
            onOpenChange={() => loadRoles()}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Chọn vai trò" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={loading || selectedRole === currentRoleId}
            onClick={handleChangeRole}
          >
            Lưu
          </Button>
        </div>
      </div>
    </div>
  );
}
