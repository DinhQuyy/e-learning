"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";

import { RichTextEditor } from "@/components/features/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch, apiPatch, apiPost } from "@/lib/api-fetch";

type LessonOption = {
  id: string;
  title: string;
};

type CriterionDraft = {
  id: string;
  title: string;
  description: string;
  max_points: number;
  scoring_guidance: string;
};

type AssignmentPayload = {
  id: string;
  title: string;
  instructions: string;
  due_at: string | null;
  max_score: number;
  status: "draft" | "published" | "archived";
  lesson: {
    id: string;
    title: string;
  };
  rubric: {
    criteria: CriterionDraft[];
  };
};

function makeLocalId() {
  return `criterion-${Math.random().toString(36).slice(2, 10)}`;
}

function toDatetimeLocal(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (input: number) => String(input).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function InstructorAssignmentForm({
  courseId,
  assignmentId,
}: {
  courseId: string;
  assignmentId?: string;
}) {
  const router = useRouter();
  const [lessons, setLessons] = useState<LessonOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [status, setStatus] = useState<"draft" | "published" | "archived">("draft");
  const [criteria, setCriteria] = useState<CriterionDraft[]>([
    {
      id: makeLocalId(),
      title: "Hiểu đúng yêu cầu",
      description: "",
      max_points: 5,
      scoring_guidance: "",
    },
  ]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setIsLoading(true);
      try {
        const [lessonsRes, assignmentRes] = await Promise.all([
          apiFetch(`/api/instructor/courses/${courseId}/lessons`),
          assignmentId ? apiFetch(`/api/instructor/courses/${courseId}/assignments/${assignmentId}`) : Promise.resolve(null),
        ]);

        const lessonsPayload = await lessonsRes.json().catch(() => null);
        if (!lessonsRes.ok) {
          throw new Error(lessonsPayload?.error || "Không thể tải danh sách bài học.");
        }

        const lessonRows = Array.isArray(lessonsPayload?.data) ? lessonsPayload.data : [];
        const normalizedLessons = lessonRows.map((lesson: { id: string | number; title: string }) => ({
          id: String(lesson.id),
          title: lesson.title,
        }));

        if (!mounted) return;
        setLessons(normalizedLessons);

        if (assignmentRes) {
          const assignmentPayload = await assignmentRes.json().catch(() => null);
          if (!assignmentRes.ok) {
            throw new Error(assignmentPayload?.error || "Không thể tải bài tập.");
          }
          const assignment = assignmentPayload?.data as AssignmentPayload | undefined;
          if (assignment) {
            setTitle(assignment.title);
            setLessonId(assignment.lesson.id);
            setInstructions(assignment.instructions);
            setDueAt(toDatetimeLocal(assignment.due_at));
            setStatus(assignment.status);
            setCriteria(
              assignment.rubric.criteria.length > 0
                ? assignment.rubric.criteria.map((criterion) => ({
                    ...criterion,
                    id: criterion.id || makeLocalId(),
                  }))
                : criteria
            );
          }
        } else if (normalizedLessons.length > 0) {
          setLessonId((current) => current || normalizedLessons[0].id);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể tải biểu mẫu bài tập.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId, courseId]);

  const handleCriterionChange = (
    criterionId: string,
    field: keyof CriterionDraft,
    value: string | number
  ) => {
    setCriteria((current) =>
      current.map((criterion) =>
        criterion.id === criterionId ? { ...criterion, [field]: value } : criterion
      )
    );
  };

  const handleAddCriterion = () => {
    setCriteria((current) => [
      ...current,
      {
        id: makeLocalId(),
        title: "",
        description: "",
        max_points: 5,
        scoring_guidance: "",
      },
    ]);
  };

  const handleRemoveCriterion = (criterionId: string) => {
    setCriteria((current) => current.filter((criterion) => criterion.id !== criterionId));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !lessonId || !instructions.trim()) {
      toast.error("Vui lòng nhập đầy đủ bài học, tiêu đề và hướng dẫn.");
      return;
    }

    const normalizedCriteria = criteria
      .map((criterion) => ({
        title: criterion.title.trim(),
        description: criterion.description.trim(),
        max_points: Number(criterion.max_points || 0),
        scoring_guidance: criterion.scoring_guidance.trim(),
      }))
      .filter((criterion) => criterion.title && criterion.max_points > 0);

    if (normalizedCriteria.length === 0) {
      toast.error("Bài tập cần ít nhất một tiêu chí chấm điểm hợp lệ.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        lesson_id: lessonId,
        title,
        instructions,
        due_at: dueAt || undefined,
        status,
        max_score: normalizedCriteria.reduce((acc, criterion) => acc + criterion.max_points, 0),
        criteria: normalizedCriteria,
      };

      const res = assignmentId
        ? await apiPatch(`/api/instructor/courses/${courseId}/assignments/${assignmentId}`, payload)
        : await apiPost(`/api/instructor/courses/${courseId}/assignments`, payload);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Không thể lưu bài tập.");
      }

      toast.success(assignmentId ? "Đã cập nhật bài tập." : "Đã tạo bài tập.");
      router.push(`/instructor/courses/${courseId}/assignments`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu bài tập.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border bg-white px-5 py-4 text-sm text-slate-500">
        <Loader2 className="size-4 animate-spin" />
        Đang tải biểu mẫu bài tập...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{assignmentId ? "Chỉnh sửa bài tập" : "Tạo bài tập mới"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="min-w-0 space-y-2">
              <Label>Bài học</Label>
              <Select value={lessonId} onValueChange={setLessonId}>
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder="Chọn bài học" />
                </SelectTrigger>
                <SelectContent>
                  {lessons.map((lesson) => (
                    <SelectItem key={lesson.id} value={lesson.id}>
                      {lesson.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Trạng thái</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Bản nháp</SelectItem>
                  <SelectItem value="published">Xuất bản</SelectItem>
                  <SelectItem value="archived">Lưu trữ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tiêu đề bài tập</Label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Phân tích kiến trúc thành phần" />
          </div>

          <div className="space-y-2">
            <Label>Hạn nộp</Label>
            <Input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Hướng dẫn làm bài</Label>
            <RichTextEditor
              value={instructions}
              onChange={setInstructions}
              placeholder="Mô tả yêu cầu, đầu ra mong muốn, tiêu chí đánh giá..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Tiêu chí chấm điểm</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={handleAddCriterion}>
            <Plus className="mr-2 size-4" />
            Thêm tiêu chí
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {criteria.map((criterion, index) => (
            <div key={criterion.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">Tiêu chí {index + 1}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveCriterion(criterion.id)}
                  disabled={criteria.length === 1}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_140px]">
                <div className="space-y-2">
                  <Label>Tên tiêu chí</Label>
                  <Input
                    value={criterion.title}
                    onChange={(event) =>
                      handleCriterionChange(criterion.id, "title", event.target.value)
                    }
                    placeholder="Ví dụ: Đúng yêu cầu đề bài"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Điểm tối đa</Label>
                  <Input
                    type="number"
                    min={1}
                    value={criterion.max_points}
                    onChange={(event) =>
                      handleCriterionChange(
                        criterion.id,
                        "max_points",
                        Number(event.target.value || 0)
                      )
                    }
                  />
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Label>Mô tả</Label>
                <Input
                  value={criterion.description}
                  onChange={(event) =>
                    handleCriterionChange(criterion.id, "description", event.target.value)
                  }
                  placeholder="Mô tả ngắn cho tiêu chí này"
                />
              </div>

              <div className="mt-4 space-y-2">
                <Label>Gợi ý chấm điểm</Label>
                <Input
                  value={criterion.scoring_guidance}
                  onChange={(event) =>
                    handleCriterionChange(
                      criterion.id,
                      "scoring_guidance",
                      event.target.value
                    )
                  }
                  placeholder="Giảng viên nên chú ý điều gì khi chấm?"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
          {assignmentId ? "Lưu cập nhật" : "Tạo bài tập"}
        </Button>
      </div>
    </div>
  );
}
