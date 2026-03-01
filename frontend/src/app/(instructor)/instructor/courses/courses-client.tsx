"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  List,
  Users,
  Star,
  Trash2,
  BookOpen,
  RefreshCcw,
  Clock3,
  Archive,
  FilePenLine,
  Check,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiPatch } from "@/lib/api-fetch";
import { getAssetUrl } from "@/lib/directus";
import type { Category, Course } from "@/types";

type InstructorCourse = Course & {
  enrollment_count: number;
  review_count: number;
};

const STATUS_OPTIONS = [
  { value: "draft", label: "Bản nháp", Icon: FilePenLine },
  { value: "review", label: "Chờ duyệt", Icon: Clock3 },
  { value: "archived", label: "Lưu trữ", Icon: Archive },
];

const statusMap: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  draft: { label: "Bản nháp", variant: "secondary" },
  review: { label: "Chờ duyệt", variant: "outline" },
  published: { label: "Đã xuất bản", variant: "default" },
  archived: { label: "Đã lưu trữ", variant: "destructive" },
};

function CourseTable({ courses }: { courses: InstructorCourse[] }) {
  const router = useRouter();

  const handleStatusChange = async (
    courseId: string,
    newStatus: (typeof STATUS_OPTIONS)[number]["value"]
  ) => {
    try {
      const res = await apiPatch(`/api/instructor/courses/${courseId}`, {
        status: newStatus,
      });
      if (!res.ok) throw new Error();

      toast.success(`Đã chuyển khóa học sang trạng thái ${statusMap[newStatus].label}`);
      router.refresh();
    } catch {
      toast.error("Có lỗi xảy ra");
    }
  };

  if (courses.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <BookOpen className="size-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center mb-4">
            Bạn chưa có khóa học nào.
          </p>
          <Link href="/instructor/courses/new">
            <Button>
              <Plus className="mr-2 size-4" />
              Tạo khóa học đầu tiên
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Khóa học</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className="text-center">Học viên</TableHead>
            <TableHead className="text-center">Đánh giá</TableHead>
            <TableHead>Ngày tạo</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {courses.map((course) => {
            const status = statusMap[course.status] ?? statusMap.draft;
            const category = course.category_id as Category | null;
            return (
              <TableRow key={course.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-muted">
                      <Image
                        src={getAssetUrl(course.thumbnail)}
                        alt={course.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate max-w-[220px]">
                        {course.title}
                      </p>
                      {category && typeof category === "object" && (
                        <p className="text-xs text-muted-foreground">
                          {category.name}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  {course.enrollment_count}
                </TableCell>
                <TableCell className="text-center">
                  {course.average_rating > 0 ? (
                    <div className="flex items-center justify-center gap-1">
                      <Star className="size-3.5 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm">
                        {Number(course.average_rating).toFixed(1)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">--</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(course.date_created), "dd/MM/yyyy", {
                      locale: vi,
                    })}
                  </span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">Thao tác</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/instructor/courses/${course.id}/edit`}>
                          <Pencil className="mr-2 size-4" />
                          Chỉnh sửa
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/instructor/courses/${course.id}/modules`}>
                          <List className="mr-2 size-4" />
                          Nội dung
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/instructor/courses/${course.id}/students`}>
                          <Users className="mr-2 size-4" />
                          Học viên
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/instructor/courses/${course.id}/reviews`}>
                          <Star className="mr-2 size-4" />
                          Đánh giá
                        </Link>
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
                      <DropdownMenuItem className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 size-4" />
                        Xoá
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function InstructorCoursesClient({
  courses,
}: {
  courses: InstructorCourse[];
}) {
  const draftCourses = courses.filter((c) => c.status === "draft");
  const pendingCourses = courses.filter((c) => c.status === "review");
  const publishedCourses = courses.filter((c) => c.status === "published");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Khoá học của tôi</h1>
          <p className="text-muted-foreground">
            Quản lý và theo dõi các khoá học bạn đã tạo
          </p>
        </div>
        <Link href="/instructor/courses/new">
          <Button>
            <Plus className="mr-2 size-4" />
            Tạo khoá học mới
          </Button>
        </Link>
      </div>

      {/* Status Filter Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Tất cả ({courses.length})</TabsTrigger>
          <TabsTrigger value="draft">Bản nháp ({draftCourses.length})</TabsTrigger>
          <TabsTrigger value="review">
            Chờ duyệt ({pendingCourses.length})
          </TabsTrigger>
          <TabsTrigger value="published">
            Đã xuất bản ({publishedCourses.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <CourseTable courses={courses} />
        </TabsContent>
        <TabsContent value="draft" className="mt-4">
          <CourseTable courses={draftCourses} />
        </TabsContent>
        <TabsContent value="review" className="mt-4">
          <CourseTable courses={pendingCourses} />
        </TabsContent>
        <TabsContent value="published" className="mt-4">
          <CourseTable courses={publishedCourses} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
