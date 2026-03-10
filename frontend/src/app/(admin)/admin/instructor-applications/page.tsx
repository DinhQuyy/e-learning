"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";

import { apiFetch } from "@/lib/api-fetch";
import {
  instructorApplicationStatusLabel,
  type InstructorApplicationRecord,
} from "@/lib/instructor-application";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type FilterStatus =
  | "ALL"
  | "PENDING"
  | "NEEDS_INFO"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

interface AdminListResponse {
  data: InstructorApplicationRecord[];
  meta?: {
    total_count?: number;
    filter_count?: number;
  };
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "APPROVED":
      return "default";
    case "REJECTED":
      return "destructive";
    case "CANCELLED":
      return "outline";
    default:
      return "secondary";
  }
}

export default function AdminInstructorApplicationsPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<FilterStatus>("PENDING");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<InstructorApplicationRecord[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams({ status });
      const res = await apiFetch(`/api/admin/instructor-applications?${params}`);

      if (!res.ok) {
        throw new Error("Không thể tải danh sách đơn");
      }

      const payload = (await res.json()) as AdminListResponse;
      setRows(payload.data ?? []);
    } catch (error) {
      console.error(error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;

    const keyword = search.trim().toLowerCase();

    return rows.filter((item) => {
      const user =
        typeof item.user_id === "object" && item.user_id
          ? [item.user_id.first_name, item.user_id.last_name, item.user_id.email]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
          : "";

      const summary =
        `${item.expertise_description} ${(item.expertise_categories || []).join(" ")}`.toLowerCase();

      return user.includes(keyword) || summary.includes(keyword);
    });
  }, [rows, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Duyệt đơn giảng viên
        </h1>
        <p className="text-gray-500">
          Quản lý danh sách hồ sơ học viên đăng ký trở thành giảng viên.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách đơn</CardTitle>
          <CardDescription>
            Chọn trạng thái để lọc và mở từng hồ sơ để xem chi tiết.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm theo tên, email, chuyên môn..."
                className="pl-9"
              />
            </div>

            <Select
              value={status}
              onValueChange={(value) => setStatus(value as FilterStatus)}
            >
              <SelectTrigger className="w-full md:w-[220px]">
                <SelectValue placeholder="Lọc trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả</SelectItem>
                <SelectItem value="PENDING">Chờ duyệt</SelectItem>
                <SelectItem value="NEEDS_INFO">Cần bổ sung</SelectItem>
                <SelectItem value="APPROVED">Đã duyệt</SelectItem>
                <SelectItem value="REJECTED">Từ chối</SelectItem>
                <SelectItem value="CANCELLED">Đã hủy</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-500">
              <Loader2 className="mr-2 size-4 animate-spin" /> Đang tải dữ
              liệu...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Học viên</TableHead>
                  <TableHead>Hình thức</TableHead>
                  <TableHead>Lĩnh vực</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày nộp</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-gray-500">
                      Không có đơn nào phù hợp.
                    </TableCell>
                  </TableRow>
                )}

                {filteredRows.map((item) => {
                  const user =
                    typeof item.user_id === "object" && item.user_id
                      ? [item.user_id.first_name, item.user_id.last_name]
                          .filter(Boolean)
                          .join(" ") || item.user_id.email || "N/A"
                      : item.user_id;

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{user}</div>
                        {typeof item.user_id === "object" && item.user_id?.email && (
                          <div className="text-xs text-gray-500">
                            {item.user_id.email}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{item.track}</TableCell>
                      <TableCell className="max-w-[260px]">
                        <div className="line-clamp-2 text-sm text-gray-500">
                          {(item.expertise_categories || []).join(", ") || "--"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(item.status)}>
                          {instructorApplicationStatusLabel[item.status] || item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(item.date_created).toLocaleDateString("vi-VN")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/admin/instructor-applications/${item.id}`}>
                            Xem chi tiết
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
