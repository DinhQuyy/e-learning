import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { InstructorAssignmentForm } from "@/components/features/instructor-assignment-form";
import { Button } from "@/components/ui/button";

export default async function EditAssignmentPage({
  params,
}: {
  params: Promise<{ id: string; assignmentId: string }>;
}) {
  const { id: courseId, assignmentId } = await params;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/instructor/courses/${courseId}/assignments`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chỉnh sửa bài tập</h1>
          <p className="text-muted-foreground">
            Cập nhật bài học, hướng dẫn và tiêu chí chấm điểm cho bài tập này.
          </p>
        </div>
      </div>

      <InstructorAssignmentForm courseId={courseId} assignmentId={assignmentId} />
    </div>
  );
}
