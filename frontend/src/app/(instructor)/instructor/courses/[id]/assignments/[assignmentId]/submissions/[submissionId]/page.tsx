import { InstructorAssignmentReviewWorkspace } from "@/components/features/instructor-assignment-review-workspace";

export default async function AssignmentSubmissionReviewPage({
  params,
}: {
  params: Promise<{ id: string; assignmentId: string; submissionId: string }>;
}) {
  const { id: courseId, assignmentId, submissionId } = await params;

  return (
    <InstructorAssignmentReviewWorkspace
      courseId={courseId}
      assignmentId={assignmentId}
      submissionId={submissionId}
    />
  );
}
