"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Search,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Star as StarIcon,
  Archive,
  RefreshCcw,
  Clock3,
  FilePenLine,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { getCourseImageSrc } from "@/lib/course-image";
import { Checkbox } from "@/components/ui/checkbox";
import { apiPatch } from "@/lib/api-fetch";

type CourseStatus = "draft" | "review" | "published" | "archived";

interface CourseData {
  id: string;
  title: string;
  slug: string;
  thumbnail: string | null;
  status: string;
  is_featured: boolean;
  total_enrollments: number;
  average_rating: number;
  date_created: string;
  category_id: { id: string; name: string } | null;
  instructors: Array<{
    user_id: {
      id: string;
      first_name: string | null;
      last_name: string | null;
    } | null;
  }>;
}

interface AdminCoursesClientProps {
  courses: CourseData[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  search: string;
  status: string;
  pendingCount: number;
}

const STATUS_OPTIONS: Array<{
  value: CourseStatus;
  label: string;
  Icon: typeof FilePenLine;
}> = [
  { value: "draft", label: "Bản nháp", Icon: FilePenLine },
  { value: "review", label: "Chờ duyệt", Icon: Clock3 },
  { value: "published", label: "Đã xuất bản", Icon: CheckCircle },
  { value: "archived", label: "Lưu trữ", Icon: Archive },
];

const STATUS_LABELS: Record<CourseStatus, string> = {
  draft: "bản nháp",
  review: "chờ duyệt",
  published: "đã xuất bản",
  archived: "lưu trữ",
};

function getStatusBadge(status: string) {
  switch (status) {
    case "published":
      return <Badge className="bg-green-100 text-green-700">Đã xuất bản</Badge>;
    case "review":
      return <Badge className="bg-yellow-100 text-yellow-700">Chờ duyệt</Badge>;
    case "draft":
      return <Badge variant="secondary">Bản nháp</Badge>;
    case "archived":
      return <Badge className="bg-gray-100 text-gray-700">Lưu trữ</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getInstructorName(course: CourseData): string {
  const inst = course.instructors?.[0]?.user_id;
  if (!inst) return "---";
  return [inst.first_name, inst.last_name].filter(Boolean).join(" ") || "---";
}

export function AdminCoursesClient({
  courses,
  currentPage,
  totalPages,
  totalCount,
  search,
  status,
  pendingCount,
}: AdminCoursesClientProps) {
  const router = useRouter();
  const searchParamsHook = useSearchParams();
  const [searchValue, setSearchValue] = useState(search);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

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
      return `/admin/courses?${params.toString()}`;
    },
    [searchParamsHook]
  );

  const handleSearch = () => {
    router.push(buildUrl({ search: searchValue, page: "1" }));
  };

  const handleTabChange = (value: string) => {
    router.push(buildUrl({ status: value, page: "1" }));
  };

  const handleAction = async (
    courseId: string,
    action: "approve" | "reject" | "feature" | "unfeature" | "archive"
  ) => {
    const body: Record<string, unknown> = {};

    switch (action) {
      case "approve":
        body.status = "published";
        break;
      case "reject":
        body.status = "draft";
        break;
      case "archive":
        body.status = "archived";
        break;
      case "feature":
        body.is_featured = true;
        break;
      case "unfeature":
        body.is_featured = false;
        break;
    }

    try {
      const res = await apiPatch(`/api/admin/courses/${courseId}`, body);

      if (!res.ok) throw new Error();

      const messages: Record<string, string> = {
        approve: "Khoá học đã được duyệt",
        reject: "Khoá học đã bị từ chối",
        archive: "Khoá học đã được lưu trữ",
        feature: "Khoá học đã được đánh dấu nổi bật",
        unfeature: "Đã bỏ đánh dấu nổi bật",
      };

      toast.success(messages[action]);
      router.refresh();
    } catch {
      toast.error("Có lỗi xảy ra");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === courses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(courses.map((c) => c.id)));
    }
  };

  const handleBulkAction = async (action: "published" | "archived" | "draft") => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const results = await Promise.allSettled(
        Array.from(selectedIds).map((id) =>
          apiPatch(`/api/admin/courses/${id}`, { status: action })
        )
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      toast.success(`Đã cập nhật ${succeeded}/${selectedIds.size} khoá học`);
      setSelectedIds(new Set());
      router.refresh();
    } catch {
      toast.error("Có lỗi xảy ra");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleStatusChange = async (
    courseId: string,
    newStatus: CourseStatus
  ) => {
    try {
      const res = await apiPatch(`/api/admin/courses/${courseId}`, {
        status: newStatus,
      });

      if (!res.ok) throw new Error();

      const label = STATUS_LABELS[newStatus] ?? newStatus;
      toast.success(`Đã chuyển khóa học sang trạng thái ${label}`);
      router.refresh();
    } catch {
      toast.error("Có lỗi xảy ra");
    }
  };

  const handleExportCSV = () => {
    if (courses.length === 0) {
      toast.error("Không có dữ liệu để xuất");
      return;
    }
    const header = "Tiêu đề,Giảng viên,Danh mục,Trạng thái,Học viên,Đánh giá,Nổi bật\n";
    const rows = courses.map((c) => {
      const instructor = getInstructorName(c);
      const category = c.category_id?.name ?? "";
      const rating = Number(c.average_rating ?? 0).toFixed(1);
      const featured = c.is_featured ? "Có" : "Không";
      return `"${c.title}","${instructor}","${category}","${c.status}",${c.total_enrollments ?? 0},${rating},"${featured}"`;
    });
    const csv = "\uFEFF" + header + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `courses-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Đã xuất file CSV");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Quản lý khoá học
          </h1>
          <p className="text-gray-500">
            Tổng cộng {totalCount} khoá học
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => {
              setSearchValue("");
              startTransition(() => router.push("/admin/courses"));
            }}
            className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-700"
          >
            <RefreshCcw className={`mr-2 h-4 w-4 transition-transform ${isPending ? "animate-spin" : ""}`} />
            {isPending ? "Đang tải..." : "Làm mới"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-700">
            <Download className="mr-2 h-4 w-4" />
            Xuất CSV
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Tìm kiếm theo tiêu đề..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-9 border-gray-300 text-gray-900 placeholder:text-gray-400"
          />
        </div>
        <Button onClick={handleSearch} className="bg-gray-900 text-white hover:bg-gray-800">Tìm kiếm</Button>
      </div>

      {/* Status Tabs */}
      <Tabs value={status} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="all">Tất cả</TabsTrigger>
          <TabsTrigger value="review" className="gap-2">
            Chờ duyệt
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1.5">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="published">Đã xuất bản</TabsTrigger>
          <TabsTrigger value="draft">Bản nháp</TabsTrigger>
          <TabsTrigger value="archived">Lưu trữ</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
          <span className="text-sm font-medium">
            Đã chọn {selectedIds.size} khoá học
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={bulkLoading}
            onClick={() => handleBulkAction("published")}
          >
            <CheckCircle className="mr-1 h-4 w-4 text-green-600" />
            Duyệt
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={bulkLoading}
            onClick={() => handleBulkAction("archived")}
          >
            <Archive className="mr-1 h-4 w-4" />
            Lưu trữ
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
          >
            Bỏ chọn
          </Button>
        </div>
      )}

      {/* Mobile Cards */}
      <div className="space-y-3 lg:hidden">
        {courses.length === 0 && (
          <p className="py-12 text-center text-gray-400">Không tìm thấy khoá học nào.</p>
        )}
        {courses.map((course) => (
          <div key={course.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <Checkbox
                checked={selectedIds.has(course.id)}
                onCheckedChange={() => toggleSelect(course.id)}
                className="mt-1"
              />
              <div className="h-12 w-20 shrink-0 overflow-hidden rounded bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={getCourseImageSrc(course)} alt={course.title} className="h-full w-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 line-clamp-1">{course.title}</p>
                <p className="text-sm text-gray-500">{getInstructorName(course)}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push(`/admin/courses/${course.id}`)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Xem chi tiết
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              {getStatusBadge(course.status)}
              <span className="text-gray-500">{course.category_id?.name ?? "---"}</span>
              <span className="ml-auto flex items-center gap-1 text-gray-600">
                <StarIcon className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                {Number(course.average_rating ?? 0).toFixed(1)}
              </span>
              <span className="text-gray-500">{course.total_enrollments ?? 0} học viên</span>
            </div>
          </div>
        ))}
      </div>

      {/* Table (desktop) */}
      <div className="hidden lg:block rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-100 hover:bg-gray-100">
              <TableHead className="w-10">
                <Checkbox
                  checked={courses.length > 0 && selectedIds.size === courses.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="w-16 text-gray-700 font-semibold text-xs uppercase tracking-wider">Ảnh</TableHead>
              <TableHead className="text-gray-700 font-semibold text-xs uppercase tracking-wider">Tiêu đề</TableHead>
              <TableHead className="text-gray-700 font-semibold text-xs uppercase tracking-wider">Giảng viên</TableHead>
              <TableHead className="text-gray-700 font-semibold text-xs uppercase tracking-wider">Danh mục</TableHead>
              <TableHead className="text-gray-700 font-semibold text-xs uppercase tracking-wider">Trạng thái</TableHead>
              <TableHead className="text-gray-700 font-semibold text-xs uppercase tracking-wider">Học viên</TableHead>
              <TableHead className="text-gray-700 font-semibold text-xs uppercase tracking-wider">Đánh giá</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-12 text-center text-gray-400"
                >
                  Không tìm thấy khoá học nào.
                </TableCell>
              </TableRow>
            )}
            {courses.map((course) => (
              <TableRow key={course.id} className="hover:bg-gray-50/50">
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(course.id)}
                    onCheckedChange={() => toggleSelect(course.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="h-10 w-16 overflow-hidden rounded bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getCourseImageSrc(course)}
                      alt={course.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-gray-900">{course.title}</p>
                    {course.is_featured && (
                      <Badge
                        variant="outline"
                        className="mt-1 border-yellow-300 text-yellow-600"
                      >
                        <StarIcon className="mr-1 h-3 w-3 fill-yellow-400" />
                        Nổi bật
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {getInstructorName(course)}
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {course.category_id?.name ?? "---"}
                </TableCell>
                <TableCell>{getStatusBadge(course.status)}</TableCell>
                <TableCell className="text-sm text-gray-700 font-medium">
                  {course.total_enrollments ?? 0}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <StarIcon className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm text-gray-700">
                      {Number(course.average_rating ?? 0).toFixed(1)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => router.push(`/admin/courses/${course.id}`)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Xem chi tiết
                      </DropdownMenuItem>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="flex items-center">
                          <RefreshCcw className="mr-2 h-4 w-4" />
                          Đổi trạng thái
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          {STATUS_OPTIONS.map(({ value, label, Icon }) => (
                            <DropdownMenuItem
                              key={value}
                              disabled={course.status === value}
                              onClick={() => handleStatusChange(course.id, value)}
                            >
                              <Icon className="mr-2 h-4 w-4" />
                              {label}
                              {course.status === value && (
                                <Check className="ml-auto h-4 w-4 text-emerald-600" />
                              )}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      <DropdownMenuSeparator />
                      {course.status === "review" && (
                        <>
                          <DropdownMenuItem
                            onClick={() => handleAction(course.id, "approve")}
                          >
                            <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                            Duyệt
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleAction(course.id, "reject")}
                          >
                            <XCircle className="mr-2 h-4 w-4 text-red-600" />
                            Từ chối
                          </DropdownMenuItem>
                        </>
                      )}
                      {course.is_featured ? (
                        <DropdownMenuItem
                          onClick={() => handleAction(course.id, "unfeature")}
                        >
                          <StarIcon className="mr-2 h-4 w-4" />
                          Bỏ nổi bật
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => handleAction(course.id, "feature")}
                        >
                          <StarIcon className="mr-2 h-4 w-4 text-yellow-500" />
                          Đánh dấu nổi bật
                        </DropdownMenuItem>
                      )}
                      {course.status !== "archived" && (
                        <DropdownMenuItem
                          onClick={() => handleAction(course.id, "archive")}
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          Lưu trữ
                        </DropdownMenuItem>
                      )}
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
