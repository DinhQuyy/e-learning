"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BookCheck, ExternalLink, Loader2, Save, Send, Sparkles } from "lucide-react";

import { RichTextEditor } from "@/components/features/rich-text-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiGet, apiPost } from "@/lib/api-fetch";

type AssignmentCriterion = {
  id: string;
  title: string;
  description: string;
  max_points: number;
  scoring_guidance: string;
};

type AssignmentPayload = {
  assignment: {
    id: string;
    title: string;
    instructions: string;
    due_at: string | null;
    max_score: number;
    status: "draft" | "published" | "archived";
    rubric: {
      id: string;
      title: string;
      criteria: AssignmentCriterion[];
    };
  };
  submission: {
    id: string;
    status: "submitted" | "reviewed";
    body_text: string;
    reference_url: string;
    submitted_at: string | null;
    reviewed_at: string | null;
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
  } | null;
} | null;

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(parsed));
}

export function LessonAssignmentBlock({ lessonId }: { lessonId: string }) {
  const [payload, setPayload] = useState<AssignmentPayload>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [bodyText, setBodyText] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadAssignment = async () => {
    setIsLoading(true);
    try {
      const res = await apiGet(`/api/lessons/${lessonId}/assignment`);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Không thể tải assignment.");
      }
      const nextPayload = (data?.data ?? null) as AssignmentPayload;
      setPayload(nextPayload);
      setBodyText(nextPayload?.submission?.body_text ?? "");
      setReferenceUrl(nextPayload?.submission?.reference_url ?? "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tải assignment.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAssignment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  const handleSubmit = async () => {
    if (!payload?.assignment) return;
    if (!bodyText.trim()) {
      toast.error("Vui lòng nhập nội dung bài nộp.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await apiPost(`/api/assignments/${payload.assignment.id}/submission`, {
        body_text: bodyText,
        reference_url: referenceUrl || undefined,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Không thể lưu bài nộp.");
      }
      toast.success(payload.submission ? "Đã cập nhật bài nộp." : "Đã nộp bài thành công.");
      await loadAssignment();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu bài nộp.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
        <CardContent className="flex items-center gap-3 p-6 text-sm text-slate-500">
          <Loader2 className="size-4 animate-spin" />
          Đang tải assignment...
        </CardContent>
      </Card>
    );
  }

  if (!payload?.assignment) {
    return null;
  }

  const assignment = payload.assignment;
  const submission = payload.submission;
  const review = submission?.review ?? null;
  const isLocked = Boolean(review);

  return (
    <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-linear-to-r from-[#eefcf4] to-[#f2f7ff]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
              <BookCheck className="size-5 text-emerald-600" />
              {assignment.title}
            </CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Bài tập của lesson này được nộp trực tiếp trong hệ thống và sẽ được giảng viên review bằng rubric.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
              Assignment
            </Badge>
            {assignment.due_at ? (
              <Badge variant="outline" className="rounded-full">
                Hạn nộp: {formatDate(assignment.due_at)}
              </Badge>
            ) : null}
            {submission ? (
              <Badge variant="outline" className="rounded-full border-blue-200 text-blue-700">
                {review ? "Đã có kết quả" : "Đã nộp"}
              </Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-5 sm:p-6">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <p className="text-sm font-semibold text-slate-900">Yêu cầu bài tập</p>
          <div
            className="prose prose-slate mt-3 max-w-none text-sm"
            dangerouslySetInnerHTML={{ __html: assignment.instructions }}
          />
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Rubric chấm điểm</p>
              <p className="text-xs text-slate-500">
                Tổng điểm tối đa: {assignment.max_score}
              </p>
            </div>
            <Badge variant="secondary" className="rounded-full">
              {assignment.rubric.criteria.length} tiêu chí
            </Badge>
          </div>

          <div className="space-y-3">
            {assignment.rubric.criteria.map((criterion) => {
              const reviewedScore = review?.criterion_scores.find(
                (item) => item.criterion_id === criterion.id
              );
              return (
                <div
                  key={criterion.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {criterion.title}
                      </p>
                      {criterion.description ? (
                        <p className="mt-1 text-sm text-slate-600">
                          {criterion.description}
                        </p>
                      ) : null}
                      {criterion.scoring_guidance ? (
                        <p className="mt-2 text-xs text-slate-500">
                          Gợi ý chấm: {criterion.scoring_guidance}
                        </p>
                      ) : null}
                    </div>
                    <Badge variant="outline" className="shrink-0 rounded-full">
                      {reviewedScore
                        ? `${reviewedScore.score}/${criterion.max_points}`
                        : `${criterion.max_points} điểm`}
                    </Badge>
                  </div>
                  {reviewedScore?.rationale ? (
                    <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      Nhận xét tiêu chí: {reviewedScore.rationale}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {review ? (
          <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Kết quả review</p>
                <p className="text-sm text-slate-600">
                  Điểm cuối: <span className="font-semibold text-emerald-700">{review.final_score}</span> /{" "}
                  {assignment.max_score}
                </p>
              </div>
              {submission?.reviewed_at ? (
                <Badge variant="outline" className="rounded-full border-emerald-200 text-emerald-700">
                  Review lúc {formatDate(submission.reviewed_at)}
                </Badge>
              ) : null}
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">Nhận xét của giảng viên</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {review.final_feedback || "Chưa có nhận xét chi tiết."}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">Bài nộp của bạn</p>
              <p className="mt-1 text-sm text-slate-500">
                Bạn có thể cập nhật bài nộp cho tới khi giảng viên bắt đầu review.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Nội dung bài làm
                </label>
                <RichTextEditor
                  value={bodyText}
                  onChange={setBodyText}
                  placeholder="Trình bày lời giải, phân tích hoặc ghi chú học tập của bạn..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Liên kết demo / tham khảo
                </label>
                <Input
                  value={referenceUrl}
                  onChange={(event) => setReferenceUrl(event.target.value)}
                  placeholder="https://..."
                  disabled={isLocked}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <div className="text-sm text-slate-500">
                {submission?.submitted_at ? (
                  <>Lần nộp gần nhất: {formatDate(submission.submitted_at)}</>
                ) : (
                  <>Chưa có bài nộp nào cho assignment này.</>
                )}
              </div>
              <Button onClick={handleSubmit} disabled={isSaving || !bodyText.trim()}>
                {isSaving ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : submission ? (
                  <Save className="mr-2 size-4" />
                ) : (
                  <Send className="mr-2 size-4" />
                )}
                {submission ? "Cập nhật bài nộp" : "Nộp bài"}
              </Button>
            </div>
          </div>
        )}

        {submission?.reference_url ? (
          <a
            href={submission.reference_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#2f57ef] hover:text-[#1d43d8]"
          >
            <ExternalLink className="size-4" />
            Mở liên kết tham khảo đã nộp
          </a>
        ) : null}

        {!review ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-3 text-sm text-slate-500">
            <span className="font-medium text-slate-700">Lưu ý:</span> AI chấm bài chỉ hỗ trợ giảng viên ở
            bước review. Học viên vẫn nộp bài và nhận phản hồi trực tiếp trong lesson này.
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-500">
            <Sparkles className="mr-2 inline size-4 text-[#2f57ef]" />
            Review này có thể đã được giảng viên tham khảo từ AI copilot, nhưng điểm cuối vẫn do giảng viên quyết định.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
