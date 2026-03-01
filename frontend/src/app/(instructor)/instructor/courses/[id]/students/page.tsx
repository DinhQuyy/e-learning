import { requireRole } from "@/lib/dal";
import {
  verifyInstructorOwnership,
  getCourseStudents,
} from "@/lib/queries/instructor";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Download } from "lucide-react";
import Link from "next/link";
import { CourseStudentsTable } from "./course-students-table";

export default async function CourseStudentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: courseId } = await params;
  const { token } = await requireRole(["instructor"]);

  const isOwner = await verifyInstructorOwnership(token, courseId);
  if (!isOwner) {
    redirect("/instructor/courses");
  }

  const students = await getCourseStudents(token, courseId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/instructor/courses">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Danh sách học viên
            </h1>
            <p className="text-muted-foreground">
              {students.length} học viên đã đăng ký
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Link href={`/instructor/courses/${courseId}/edit`}>
            <Button variant="outline" size="sm">
              Thông tin khoá học
            </Button>
          </Link>
          <Button variant="outline" size="sm" disabled>
            <Download className="mr-2 size-4" />
            Xuất dữ liệu
          </Button>
        </div>
      </div>

      {/* Students Table */}
      {students.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="size-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Chưa có học viên nào đăng ký khoá học này.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Học viên</CardTitle>
            <CardDescription>
              Danh sách tất cả học viên đã đăng ký khoá học
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CourseStudentsTable students={students} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
