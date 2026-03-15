import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/lib/dal";
import {
  getCourseStudents,
  verifyInstructorOwnership,
} from "@/lib/queries/instructor";
import { CourseStudentsTable } from "./course-students-table";
import { ExportStudentsButton } from "./export-students-button";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ studentId?: string }>;
};

export default async function CourseStudentsPage({
  params,
  searchParams,
}: PageProps) {
  const [{ id: courseId }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const { token } = await requireRole(["instructor"]);

  const isOwner = await verifyInstructorOwnership(token, courseId);
  if (!isOwner) {
    redirect("/instructor/courses");
  }

  const students = await getCourseStudents(token, courseId);
  const visibleStudents = students.filter((student) => {
    const user = student.user as unknown;
    return Boolean(
      user &&
        typeof user === "object" &&
        "id" in user &&
        (user as { id?: string }).id
    );
  });

  const requestedStudentId = resolvedSearchParams.studentId?.trim() ?? "";
  const focusedStudents = requestedStudentId
    ? visibleStudents.filter((student) => {
        const user = student.user as { id?: string } | null;
        return Boolean(user?.id && String(user.id) === requestedStudentId);
      })
    : [];

  const isFocusedView = requestedStudentId.length > 0 && focusedStudents.length > 0;
  const displayedStudents = isFocusedView ? focusedStudents : visibleStudents;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/instructor/courses">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Danh sách học viên</h1>
            <p className="text-muted-foreground">
              {isFocusedView
                ? `Đang xem 1 học viên được gợi ý can thiệp trong tổng số ${visibleStudents.length} học viên`
                : `${visibleStudents.length} học viên đã đăng ký`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {isFocusedView ? (
            <Link href={`/instructor/courses/${courseId}/students`}>
              <Button variant="secondary" size="sm">
                Xem tất cả học viên
              </Button>
            </Link>
          ) : null}
          <Link href={`/instructor/courses/${courseId}/edit`}>
            <Button variant="outline" size="sm">
              Thông tin khóa học
            </Button>
          </Link>
          <ExportStudentsButton courseId={courseId} students={displayedStudents} />
        </div>
      </div>

      {isFocusedView ? (
        <Card className="border-blue-200 bg-blue-50/60">
          <CardContent className="flex flex-col gap-2 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Đang mở đúng học viên được đánh dấu rủi ro
              </p>
              <p className="text-sm text-slate-600">
                Bạn có thể xem chi tiết học viên này hoặc quay lại danh sách đầy đủ để so sánh với cả lớp.
              </p>
            </div>
            <Link href={`/instructor/courses/${courseId}/students`}>
              <Button variant="outline" size="sm">
                Quay lại danh sách lớp
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {displayedStudents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="mb-4 size-12 text-muted-foreground" />
            <p className="text-center text-muted-foreground">
              {requestedStudentId
                ? "Không tìm thấy học viên phù hợp trong khóa học này. Hệ thống đã giữ nguyên danh sách lớp nếu có dữ liệu."
                : "Chưa có học viên nào đăng ký khóa học này."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{isFocusedView ? "Học viên được chọn" : "Học viên"}</CardTitle>
            <CardDescription>
              {isFocusedView
                ? "Thông tin của học viên được chọn từ bảng nguy cơ bỏ dở."
                : "Danh sách tất cả học viên đã đăng ký khóa học."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CourseStudentsTable students={displayedStudents} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
