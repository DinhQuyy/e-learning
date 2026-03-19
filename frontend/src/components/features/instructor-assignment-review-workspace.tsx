"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Save,
  Sparkles,
  Wand2,
} from "lucide-react";

import { AiInsightCard } from "@/components/features/ai-insight-card";
import { AiSurfaceState } from "@/components/features/ai-surface-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, apiPost } from "@/lib/api-fetch";
import type { InstructorReviewCopilotResponse } from "@/lib/ai-schemas";

type WorkspacePayload = {
  assignment: {
    id: string;
    title: string;
    instructions: string;
    due_at: string | null;
    max_score: number;
    lesson: {
      id: string;
      title: string;
    };
    rubric: {
      criteria: Array<{
        id: string;
        title: string;
        description: string;
        max_points: number;
        scoring_guidance: string;
      }>;
    };
    counts: {
      total: number;
      needs_review: number;
      reviewed: number;
    };
  };
  submission: {
    id: string;
    status: "submitted" | "reviewed";
    body_text: string;
    reference_url: string;
    submitted_at: string | null;
    reviewed_at: string | null;
    user: {
      id: string;
      name: string;
      email: string;
    } | null;
    review: {
      id: string;
      status: "draft" | "finalized";
      final_score: number;
      criterion_scores: Array<{
        criterion_id: string;
        title: string;
        max_points: number;
        score: number;
        rationale?: string | null;
      }>;
      final_feedback: string;
    } | null;
  };
  navigation: {
    previous_submission_id: string | null;
    next_submission_id: string | null;
    total_visible: number;
    current_position: number;
    student_filter: string | null;
  };
};

type CriterionScoreDraft = {
  criterion_id: string;
  title: string;
  max_points: number;
  score: number;
  rationale?: string | null;
};

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(parsed));
}

export function InstructorAssignmentReviewWorkspace({
  courseId,
  assignmentId,
  submissionId,
}: {
  courseId: string;
  assignmentId: string;
  submissionId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentIdFilter = searchParams.get("studentId")?.trim() ?? "";

  const [workspace, setWorkspace] = useState<WorkspacePayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [criterionScores, setCriterionScores] = useState<CriterionScoreDraft[]>([]);
  const [finalFeedback, setFinalFeedback] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState<InstructorReviewCopilotResponse | null>(null);
  const [aiArtifactId, setAiArtifactId] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const loadWorkspace = async () => {
    setIsLoading(true);
    try {
      const suffix = studentIdFilter ? `?studentId=${encodeURIComponent(studentIdFilter)}` : "";
      const res = await apiFetch(
        `/api/instructor/courses/${courseId}/assignments/${assignmentId}/submissions/${submissionId}${suffix}`
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Không thể tải không gian chấm bài.");
      }
      const payload = data?.data as WorkspacePayload;
      setWorkspace(payload);
      const baseScores =
        payload.submission.review?.criterion_scores?.length
          ? payload.submission.review.criterion_scores
          : payload.assignment.rubric.criteria.map((criterion) => ({
              criterion_id: criterion.id,
              title: criterion.title,
              max_points: criterion.max_points,
              score: 0,
              rationale: "",
            }));
      setCriterionScores(baseScores);
      setFinalFeedback(payload.submission.review?.final_feedback ?? "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tải không gian chấm bài.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, assignmentId, submissionId, studentIdFilter]);

  const finalScore = useMemo(
    () => Math.round(criterionScores.reduce((acc, item) => acc + Number(item.score || 0), 0) * 100) / 100,
    [criterionScores]
  );

  const handleScoreChange = (criterionId: string, score: number) => {
    setCriterionScores((current) =>
      current.map((criterion) =>
        criterion.criterion_id === criterionId ? { ...criterion, score } : criterion
      )
    );
  };

  const handleSave = async (status: "draft" | "finalized") => {
    if (!workspace) return;
    setIsSaving(true);
    try {
      const res = await apiPost(
        `/api/instructor/courses/${courseId}/assignments/${assignmentId}/submissions/${submissionId}/review`,
        {
          status,
          criterion_scores: criterionScores,
          final_feedback: finalFeedback,
          artifact_id: aiArtifactId,
          artifact_state: aiArtifactId && aiSuggestion ? "applied" : undefined,
        }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Không thể lưu review.");
      }
      toast.success(status === "finalized" ? "Đã chốt review." : "Đã lưu bản nháp review.");
      await loadWorkspace();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu review.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateAi = async () => {
    setIsGeneratingAi(true);
    setAiError(null);
    try {
      const res = await apiPost("/api/ai/instructor-review-copilot", {
        course_id: courseId,
        assignment_id: assignmentId,
        submission_id: submissionId,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Không thể tạo gợi ý AI.");
      }
      setAiSuggestion(data?.data ?? null);
      setAiArtifactId(data?.meta?.artifact_id ? String(data.meta.artifact_id) : null);
      toast.success("Đã tạo gợi ý AI cho không gian chấm bài.");
    } catch (error) {
      const nextError = error instanceof Error ? error.message : "Không thể tạo gợi ý AI.";
      setAiError(nextError);
      toast.error(nextError);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const applyAiSuggestion = () => {
    if (!workspace || !aiSuggestion) return;
    const nextScores = workspace.assignment.rubric.criteria.map((criterion) => {
      const suggested = aiSuggestion.criteria.find((item) => item.criterion_id === criterion.id);
      return {
        criterion_id: criterion.id,
        title: criterion.title,
        max_points: criterion.max_points,
        score: suggested ? Number(suggested.suggested_score) : 0,
        rationale: suggested?.rationale ?? "",
      };
    });
    setCriterionScores(nextScores);
    setFinalFeedback(aiSuggestion.proposed_final_feedback);
    toast.success("Đã áp dụng gợi ý AI vào bản nháp review.");
  };

  if (isLoading || !workspace) {
    return (
      <AiSurfaceState
        state="loading"
        title="Đang tải không gian chấm bài"
        description="Đang tải bối cảnh assignment, bài nộp, rubric và bản nháp review hiện tại."
      />
    );
  }

  const { assignment, submission, navigation } = workspace;
  const reviewLocked = submission.review?.status === "finalized";
  const basePath = `/instructor/courses/${courseId}/assignments/${assignmentId}/submissions`;
  const suffix = navigation.student_filter
    ? `?studentId=${encodeURIComponent(navigation.student_filter)}`
    : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <Link href={`/instructor/courses/${courseId}/assignments`}>
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">Không gian chấm bài với AI</h1>
            <p className="truncate text-muted-foreground sm:whitespace-normal">
              {submission.user?.name || submission.user?.email || "Học viên"} • {assignment.title}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateAi}
            disabled={isGeneratingAi || reviewLocked}
            className="w-full sm:w-auto"
          >
            {isGeneratingAi ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 size-4" />
            )}
            Tạo gợi ý AI
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSave("draft")}
            disabled={isSaving || reviewLocked}
            className="w-full sm:w-auto"
          >
            {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
            Lưu bản nháp
          </Button>
          <Button onClick={() => handleSave("finalized")} disabled={isSaving || reviewLocked} className="w-full sm:w-auto">
            {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}
            Chốt review
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-600">
          Bài nộp {navigation.current_position} / {navigation.total_visible}
          {submission.submitted_at ? ` • Nộp lúc ${formatDate(submission.submitted_at)}` : ""}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            href={
              navigation.previous_submission_id
                ? `${basePath}/${navigation.previous_submission_id}${suffix}`
                : "#"
            }
          >
            <Button variant="outline" size="sm" disabled={!navigation.previous_submission_id} className="w-full sm:w-auto">
              <ChevronLeft className="mr-2 size-4" />
              Trước
            </Button>
          </Link>
          <Link
            href={
              navigation.next_submission_id
                ? `${basePath}/${navigation.next_submission_id}${suffix}`
                : "#"
            }
          >
            <Button variant="outline" size="sm" disabled={!navigation.next_submission_id} className="w-full sm:w-auto">
              Sau
              <ChevronRight className="ml-2 size-4" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_420px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bối cảnh assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-sm font-semibold text-slate-900">{assignment.title}</p>
                <p className="mt-1 text-sm text-slate-500">
                  Bài học: {assignment.lesson.title} • Tổng điểm {assignment.max_score}
                </p>
                <div
                  className="prose prose-slate mt-4 max-w-none text-sm"
                  dangerouslySetInnerHTML={{ __html: assignment.instructions }}
                />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">
                  {submission.user?.name || submission.user?.email || "Học viên"}
                </p>
                {submission.user?.email ? (
                  <p className="mt-1 text-sm text-slate-500">{submission.user.email}</p>
                ) : null}
                {submission.reference_url ? (
                  <a
                    href={submission.reference_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex text-sm font-medium text-[#2f57ef] hover:text-[#1d43d8]"
                  >
                    Mở liên kết tham khảo
                  </a>
                ) : null}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">Nội dung bài nộp</p>
                <div
                  className="prose prose-slate mt-4 max-w-none text-sm"
                  dangerouslySetInnerHTML={{ __html: submission.body_text || "<p>Không có nội dung.</p>" }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Chấm theo rubric</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {assignment.rubric.criteria.map((criterion) => {
                const draft =
                  criterionScores.find((item) => item.criterion_id === criterion.id) ??
                  {
                    criterion_id: criterion.id,
                    title: criterion.title,
                    max_points: criterion.max_points,
                    score: 0,
                    rationale: "",
                  };
                return (
                  <div key={criterion.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{criterion.title}</p>
                        {criterion.description ? (
                          <p className="mt-1 text-sm text-slate-600">{criterion.description}</p>
                        ) : null}
                        {criterion.scoring_guidance ? (
                          <p className="mt-2 text-xs text-slate-500">
                            Gợi ý chấm: {criterion.scoring_guidance}
                          </p>
                        ) : null}
                      </div>
                      <div className="w-full sm:w-28">
                        <Input
                          type="number"
                          min={0}
                          max={criterion.max_points}
                          step={0.5}
                          value={draft.score}
                          onChange={(event) =>
                            handleScoreChange(criterion.id, Number(event.target.value || 0))
                          }
                          disabled={reviewLocked}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">Điểm tối đa: {criterion.max_points}</p>
                    {draft.rationale ? (
                      <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        Ghi chú bản nháp: {draft.rationale}
                      </div>
                    ) : null}
                  </div>
                );
              })}

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3">
                <p className="text-sm text-emerald-800">
                  Tổng điểm bản nháp hiện tại: <span className="font-semibold">{finalScore}</span> /{" "}
                  {assignment.max_score}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Nhận xét cuối cùng</label>
                <Textarea
                  value={finalFeedback}
                  onChange={(event) => setFinalFeedback(event.target.value)}
                  rows={8}
                  disabled={reviewLocked}
                  placeholder="Nhận xét cuối cùng gửi cho học viên..."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Khung gợi ý AI</CardTitle>
              {aiSuggestion ? (
                <Button variant="outline" size="sm" onClick={applyAiSuggestion} disabled={reviewLocked} className="w-full sm:w-auto">
                  Áp dụng gợi ý AI
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-4">
              {isGeneratingAi && !aiSuggestion ? (
                <AiSurfaceState
                  state="loading"
                  title="Đang tạo gợi ý AI"
                  description="AI đang tổng hợp rubric, bài nộp, bằng chứng và phản hồi đề xuất cho bài nộp này."
                />
              ) : aiError ? (
                <AiSurfaceState
                  state="error"
                  title="Không thể tạo gợi ý AI"
                  description={aiError}
                  actionLabel={reviewLocked ? undefined : "Thử lại"}
                  onAction={reviewLocked ? undefined : handleGenerateAi}
                />
              ) : aiSuggestion ? (
                <>
                  <AiInsightCard
                    title="Tổng quan gợi ý AI"
                    description={aiSuggestion.overall_summary}
                    trustTone="advisory"
                    badgeLabel="Gợi ý AI"
                    actions={
                      <span className="ai-badge ai-badge--soft ai-badge--neutral">
                        Mức tin cậy: {aiSuggestion.confidence}
                      </span>
                    }
                  />

                  {aiSuggestion.criteria.map((criterion) => (
                    <AiInsightCard
                      key={criterion.criterion_id}
                      title={criterion.title}
                      description={criterion.rationale}
                      trustTone="advisory"
                      actions={
                        <span className="ai-badge ai-badge--soft ai-badge--neutral">
                          {criterion.suggested_score}/{criterion.max_points}
                        </span>
                      }
                    >
                      {criterion.evidence_snippets.length > 0 ? (
                        <div className="space-y-2">
                          {criterion.evidence_snippets.map((snippet, index) => (
                            <div
                              key={`${criterion.criterion_id}-${index}`}
                              className="rounded-xl border border-slate-200 bg-slate-50/85 px-3 py-2 text-xs leading-5 text-slate-600"
                            >
                              {snippet}
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {criterion.caution_flag ? (
                        <div className="mt-3">
                          <AiSurfaceState
                            state="restricted"
                            title="Lưu ý"
                            description={criterion.caution_flag}
                          />
                        </div>
                      ) : null}
                    </AiInsightCard>
                  ))}

                  <AiInsightCard
                    title="Nhận xét cuối cùng đề xuất"
                    trustTone="advisory"
                    badgeLabel="Bản nháp AI"
                  >
                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {aiSuggestion.proposed_final_feedback}
                    </p>
                  </AiInsightCard>

                  {aiSuggestion.caution_flags.length > 0 ? (
                    <AiInsightCard
                      title="Các điểm cần kiểm tra lại"
                      description="Những điểm AI muốn giảng viên xem kỹ trước khi chốt."
                      trustTone="caution"
                      badgeLabel="Xem kỹ"
                    >
                      <ul className="space-y-2 pl-5 text-sm leading-6 text-slate-700">
                        {aiSuggestion.caution_flags.map((flag) => (
                          <li key={flag}>{flag}</li>
                        ))}
                      </ul>
                    </AiInsightCard>
                  ) : null}
                </>
              ) : (
                <AiSurfaceState
                  state="empty"
                  title="Chưa có gợi ý AI nào"
                  description="Hãy tạo gợi ý AI trước. Sau đó bạn có thể áp dụng vào bản nháp review rồi chỉnh lại thủ công trước khi chốt."
                  actionLabel={reviewLocked ? undefined : "Tạo gợi ý AI"}
                  onAction={reviewLocked ? undefined : handleGenerateAi}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
