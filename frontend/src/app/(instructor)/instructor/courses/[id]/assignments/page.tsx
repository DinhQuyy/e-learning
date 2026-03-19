"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ClipboardCheck, Eye, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiDelete, apiFetch } from "@/lib/api-fetch";

type AssignmentRow = {
  id: string;
  title: string;
  due_at: string | null;
  max_score: number;
  status: "draft" | "published" | "archived";
  lesson: {
    id: string;
    title: string;
  };
  counts: {
    total: number;
    needs_review: number;
    reviewed: number;
  };
  submissions: Array<{
    id: string;
    user: { id: string; name: string; email: string } | null;
    review: { status: "draft" | "finalized" } | null;
    submitted_at: string | null;
  }>;
};

function formatDate(value: string | null) {
  if (!value) return "Không có hạn";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "Không có hạn";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(parsed));
}

const statusMap: Record<string, string> = {
  draft: "Bản nháp",
  published: "Xuất bản",
  archived: "Lưu trữ",
};

export default function CourseAssignmentsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const courseId = String(params.id ?? "");
  const focusedStudentId = searchParams.get("studentId")?.trim() ?? "";

  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadAssignments = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch(`/api/instructor/courses/${courseId}/assignments`);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Không thể tải danh sách bài tập.");
      }
      setAssignments(Array.isArray(data?.data) ? data.data : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tải danh sách bài tập.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const visibleAssignments = useMemo(() => {
    if (!focusedStudentId) return assignments;
    return assignments.filter((assignment) =>
      assignment.submissions.some((submission) => submission.user?.id === focusedStudentId)
    );
  }, [assignments, focusedStudentId]);

  const pickReviewLink = (assignment: AssignmentRow) => {
    const ordered = [...assignment.submissions];
    const candidatePool = focusedStudentId
      ? ordered.filter((submission) => submission.user?.id === focusedStudentId)
      : ordered;
    const pending =
      candidatePool.find((submission) => !submission.review || submission.review.status !== "finalized") ??
      candidatePool[0];
    return pending
      ? `/instructor/courses/${courseId}/assignments/${assignment.id}/submissions/${pending.id}${focusedStudentId ? `?studentId=${encodeURIComponent(focusedStudentId)}` : ""}`
      : null;
  };

  const handleDelete = async (assignmentId: string) => {
    setDeletingId(assignmentId);
    try {
      const res = await apiDelete(`/api/instructor/courses/${courseId}/assignments/${assignmentId}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Không thể xóa bài tập.");
      }
      toast.success("Đã xóa bài tập.");
      await loadAssignments();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa bài tập.");
    } finally {
      setDeletingId(null);
    }
  };

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
            <h1 className="text-2xl font-bold tracking-tight">Bài tập</h1>
            <p className="text-muted-foreground">
              {visibleAssignments.length} bài tập trong khóa học
            </p>
          </div>
        </div>
        <Link href={`/instructor/courses/${courseId}/assignments/new`}>
          <Button>
            <Plus className="mr-2 size-4" />
            Tạo bài tập
          </Button>
        </Link>
      </div>

      {focusedStudentId ? (
        <Card className="border-blue-200 bg-blue-50/70">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <p className="text-sm text-slate-700">
              Đang lọc theo học viên được chọn từ khu vực giảng viên. Danh sách chỉ hiển thị các bài tập có bài nộp của học viên này.
            </p>
            <Link href={`/instructor/courses/${courseId}/assignments`}>
              <Button variant="outline" size="sm">
                Xem toàn bộ bài tập
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-10 text-sm text-slate-500">
            <Loader2 className="size-4 animate-spin" />
            Đang tải danh sách bài tập...
          </CardContent>
        </Card>
      ) : visibleAssignments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <ClipboardCheck className="size-12 text-slate-300" />
            <p className="mt-4 text-lg font-semibold text-slate-900">Chưa có bài tập nào</p>
            <p className="mt-2 max-w-xl text-sm text-slate-500">
              Hãy tạo bài tập gắn với bài học để học viên nộp bài và giảng viên chấm trực tiếp trong không gian làm việc mới.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {visibleAssignments.map((assignment) => {
            const reviewLink = pickReviewLink(assignment);
            return (
              <Card key={assignment.id}>
                <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-lg">{assignment.title}</CardTitle>
                      <Badge variant={assignment.status === "published" ? "default" : assignment.status === "archived" ? "secondary" : "outline"}>
                        {statusMap[assignment.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500">
                      Bài học: <span className="font-medium text-slate-700">{assignment.lesson.title}</span>
                    </p>
                    <p className="text-sm text-slate-500">
                      Hạn nộp: {formatDate(assignment.due_at)} · Tổng điểm: {assignment.max_score}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/instructor/courses/${courseId}/assignments/${assignment.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Pencil className="mr-2 size-4" />
                        Chỉnh sửa
                      </Button>
                    </Link>
                    {reviewLink ? (
                      <Link href={reviewLink}>
                        <Button size="sm">
                          <Eye className="mr-2 size-4" />
                          Hàng chờ chấm
                        </Button>
                      </Link>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(assignment.id)}
                      disabled={deletingId === assignment.id}
                    >
                      {deletingId === assignment.id ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 size-4" />
                      )}
                      Xoá
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Bài nộp</p>
                      <p className="mt-1 text-xl font-semibold text-slate-900">{assignment.counts.total}</p>
                    </div>
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-amber-700">Cần chấm</p>
                      <p className="mt-1 text-xl font-semibold text-amber-900">
                        {assignment.counts.needs_review}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-emerald-700">Đã chấm</p>
                      <p className="mt-1 text-xl font-semibold text-emerald-900">
                        {assignment.counts.reviewed}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
