import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { InstructorAssignmentForm } from "@/components/features/instructor-assignment-form";
import { Button } from "@/components/ui/button";

export default async function NewAssignmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: courseId } = await params;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/instructor/courses/${courseId}/assignments`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tạo bài tập mới</h1>
          <p className="text-muted-foreground">
            Tạo bài tập gắn với bài học và tiêu chí chấm điểm cho khu vực giảng viên.
          </p>
        </div>
      </div>

      <InstructorAssignmentForm courseId={courseId} />
    </div>
  );
}
