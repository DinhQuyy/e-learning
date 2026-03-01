"use client";

import { useState, useCallback } from "react";
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
} from "lucide-react";
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
import { getAssetUrl } from "@/lib/directus";
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Quản lý khoá học
        </h1>
        <p className="text-muted-foreground">
          Tổng cộng {totalCount} khoá học
        </p>
      </div>

      {/* Search */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm theo tiêu đề..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-9"
          />
        </div>
        <Button onClick={handleSearch}>Tìm kiếm</Button>
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

      {/* Table */}
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Ảnh</TableHead>
              <TableHead>Tiêu đề</TableHead>
              <TableHead>Giảng viên</TableHead>
              <TableHead>Danh mục</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Học viên</TableHead>
              <TableHead>Đánh giá</TableHead>
              <TableHead className="w-12">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-12 text-center text-muted-foreground"
                >
                  Không tìm thấy khoá học nào.
                </TableCell>
              </TableRow>
            )}
            {courses.map((course) => (
              <TableRow key={course.id}>
                <TableCell>
                  <div className="h-10 w-16 overflow-hidden rounded bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getAssetUrl(course.thumbnail)}
                      alt={course.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{course.title}</p>
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
                <TableCell className="text-sm">
                  {getInstructorName(course)}
                </TableCell>
                <TableCell className="text-sm">
                  {course.category_id?.name ?? "---"}
                </TableCell>
                <TableCell>{getStatusBadge(course.status)}</TableCell>
                <TableCell className="text-sm">
                  {course.total_enrollments ?? 0}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <StarIcon className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm">
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
    </div>
  );
}
