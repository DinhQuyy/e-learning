"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import {
  Search,
  MoreHorizontal,
  Eye,
  UserCog,
  Ban,
  CheckCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { getAssetUrl } from "@/lib/directus";
import { apiPatch, apiDelete, apiFetch } from "@/lib/api-fetch";

interface UserData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  avatar: string | null;
  status: string;
  date_created: string;
  role: {
    id: string;
    name: string;
  } | null;
}

interface AdminUsersClientProps {
  users: UserData[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  search: string;
  role: string;
  status: string;
}

function getRoleBadge(user: UserData) {
  const role = user.role;
  if (!role) return <Badge variant="secondary">Không xác định</Badge>;
  const name = role.name?.toLowerCase();
  if (name === "administrator") return <Badge className="bg-red-100 text-red-700">Admin</Badge>;
  if (name === "instructor" || name === "giảng viên")
    return <Badge className="bg-blue-100 text-blue-700">Giảng viên</Badge>;
  return <Badge className="bg-green-100 text-green-700">Học viên</Badge>;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge className="bg-emerald-100 text-emerald-700">Hoạt động</Badge>;
    case "suspended":
      return <Badge className="bg-red-100 text-red-700">Vô hiệu hoá</Badge>;
    case "draft":
      return <Badge variant="secondary">Bản nháp</Badge>;
    case "invited":
      return <Badge className="bg-yellow-100 text-yellow-700">Đã mời</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function AdminUsersClient({
  users,
  currentPage,
  totalPages,
  totalCount,
  search,
  role,
  status,
}: AdminUsersClientProps) {
  const router = useRouter();
  const searchParamsHook = useSearchParams();
  const [searchValue, setSearchValue] = useState(search);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const buildUrl = useCallback(
    (overrides: Record<string, string>) => {
      const params = new URLSearchParams(searchParamsHook.toString());
      Object.entries(overrides).forEach(([k, v]) => {
        if (v && v !== "all" && v !== "") {
          params.set(k, v);
        } else {
          params.delete(k);
        }
      });
      return `/admin/users?${params.toString()}`;
    },
    [searchParamsHook]
  );

  const handleSearch = () => {
    router.push(buildUrl({ search: searchValue, page: "1" }));
  };

  const handleRoleFilter = (value: string) => {
    router.push(buildUrl({ role: value, page: "1" }));
  };

  const handleStatusFilter = (value: string) => {
    router.push(buildUrl({ status: value, page: "1" }));
  };

  const handleToggleStatus = async (user: UserData) => {
    const newStatus = user.status === "active" ? "suspended" : "active";
    try {
      const res = await apiPatch(`/api/admin/users/${user.id}`, { status: newStatus });
      if (!res.ok) throw new Error();
      toast.success(
        newStatus === "active"
          ? "Tài khoản đã được kích hoạt"
          : "Tài khoản đã bị vô hiệu hoá"
      );
      router.refresh();
    } catch {
      toast.error("Có lỗi xảy ra");
    }
  };

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
      // ignore; dropdown will stay empty if fetch fails
    }
  };

  const handleChangeRole = async () => {
    if (!selectedUser || !selectedRole) return;
    setLoading(true);
    try {
      const res = await apiPatch(`/api/admin/users/${selectedUser.id}`, { role: selectedRole });
      if (!res.ok) throw new Error();
      toast.success("Đã cập nhật vai trò thành công");
      setRoleDialogOpen(false);
      router.refresh();
    } catch {
      toast.error("Có lỗi xảy ra khi cập nhật vai trò");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (user: UserData) => {
    if (!confirm(`Bạn có chắc chắn muốn xoá người dùng "${userName(user)}"?`)) return;
    try {
      const res = await apiDelete(`/api/admin/users/${user.id}`);
      if (!res.ok) throw new Error();
      toast.success("Đã xoá người dùng");
      router.refresh();
    } catch {
      toast.error("Có lỗi xảy ra khi xoá");
    }
  };

  const userName = (user: UserData) =>
    [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Quản lý người dùng
          </h1>
          <p className="text-muted-foreground">
            Tổng cộng {totalCount} người dùng
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm theo tên hoặc email..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-9"
          />
        </div>
        <Select value={role} onValueChange={handleRoleFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Vai trò" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả vai trò</SelectItem>
            <SelectItem value="Administrator">Admin</SelectItem>
            <SelectItem value="Instructor">Giảng viên</SelectItem>
            <SelectItem value="Student">Học viên</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="active">Hoạt động</SelectItem>
            <SelectItem value="suspended">Vô hiệu hoá</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleSearch}>Tìm kiếm</Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Tên</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead className="w-12">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  Không tìm thấy người dùng nào.
                </TableCell>
              </TableRow>
            )}
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={getAssetUrl(user.avatar)}
                      alt={userName(user)}
                    />
                    <AvatarFallback className="text-xs">
                      {userName(user).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">{userName(user)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {user.email}
                </TableCell>
                <TableCell>{getRoleBadge(user)}</TableCell>
                <TableCell>{getStatusBadge(user.status)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {user.date_created
                    ? format(new Date(user.date_created), "dd/MM/yyyy", {
                        locale: vi,
                      })
                    : "---"}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/users/${user.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Xem chi tiết
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedUser(user);
                          setSelectedRole(user.role?.id ?? "");
                          setRoleDialogOpen(true);
                          loadRoles();
                        }}
                      >
                        <UserCog className="mr-2 h-4 w-4" />
                        Đổi vai trò
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleToggleStatus(user)}
                      >
                        {user.status === "active" ? (
                          <>
                            <Ban className="mr-2 h-4 w-4" />
                            Vô hiệu hoá
                          </>
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Kích hoạt
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => handleDelete(user)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Xoá
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Trang {currentPage} / {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
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

      {/* Change Role Dialog */}
      <Dialog
        open={roleDialogOpen}
        onOpenChange={(open) => {
          setRoleDialogOpen(open);
          if (open) loadRoles();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Đổi vai trò người dùng
            </DialogTitle>
            <DialogDescription>
              Thay đổi vai trò cho{" "}
              {selectedUser ? userName(selectedUser) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Vai trò mới</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Huỷ
            </Button>
            <Button onClick={handleChangeRole} disabled={loading}>
              {loading ? "Đang cập nhật..." : "Cập nhật"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
