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
  const visibleStudents = students.filter((student) => {
    const user = student.user as unknown;
    return Boolean(
      user &&
        typeof user === "object" &&
        "id" in user &&
        (user as { id?: string }).id
    );
  });

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
            <h1 className="text-2xl font-bold tracking-tight">Danh sach hoc vien</h1>
            <p className="text-muted-foreground">
              {visibleStudents.length} hoc vien da dang ky
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Link href={`/instructor/courses/${courseId}/edit`}>
            <Button variant="outline" size="sm">
              Thong tin khoa hoc
            </Button>
          </Link>
          <Button variant="outline" size="sm" disabled>
            <Download className="mr-2 size-4" />
            Xuat du lieu
          </Button>
        </div>
      </div>

      {/* Students Table */}
      {visibleStudents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="size-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Chua co hoc vien nao dang ky khoa hoc nay.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Hoc vien</CardTitle>
            <CardDescription>
              Danh sach tat ca hoc vien da dang ky khoa hoc
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CourseStudentsTable students={visibleStudents} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
