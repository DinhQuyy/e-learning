"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRight,
  BookOpenCheck,
  CheckCircle2,
  RefreshCcw,
  Sparkles,
  Target,
} from "lucide-react";

import { AiSurfaceState } from "@/components/features/ai-surface-state";
import { useAiUi } from "@/components/providers/ai-ui-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiPost } from "@/lib/api-fetch";
import { trackAiEvent } from "@/lib/ai-tracking";
import type { QuizMistakeReviewResponse } from "@/lib/ai-schemas";

async function fetchMistakeReview(
  quizId: string,
  attemptId: string,
  lessonId: string | undefined,
  currentPath: string
): Promise<QuizMistakeReviewResponse> {
  const res = await apiPost("/api/ai/quiz-mistake-review", {
    quiz_id: quizId,
    attempt_id: attemptId,
    lesson_id: lessonId,
    current_path: currentPath,
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(typeof payload?.error === "string" ? payload.error : "Không thể tải Phân tích lỗi AI.");
  }
  return payload?.data as QuizMistakeReviewResponse;
}

export function QuizMistakeReview({
  quizId,
  attemptId,
  lessonId,
  courseId,
  currentPath,
  onRetry,
}: {
  quizId: string;
  attemptId: string;
  lessonId?: string;
  courseId?: string;
  currentPath: string;
  onRetry?: () => void;
}) {
  const { openChat } = useAiUi();
  const [data, setData] = useState<QuizMistakeReviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReview = useCallback(async () => {
    setLoading(true);
    setError(null);
    trackAiEvent("mistake_review_load", { quiz_id: quizId, attempt_id: attemptId });
    try {
      setData(await fetchMistakeReview(quizId, attemptId, lessonId, currentPath));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Không thể tải Phân tích lỗi AI.");
    } finally {
      setLoading(false);
    }
  }, [attemptId, currentPath, lessonId, quizId]);

  useEffect(() => {
    void loadReview();
  }, [loadReview]);

  const openQuizChat = (prefill: string) => {
    trackAiEvent("mistake_review_cta_click", {
      action: "ask_ai",
      quiz_id: quizId,
      attempt_id: attemptId,
    });
    openChat({
      prefill,
      contextOverride: {
        surface: "quiz_mistake_review",
        title: "Phân tích lỗi AI",
        description: "Giải thích vì sao bạn làm sai và nên ôn lại phần nào tiếp theo.",
        starterPrompts: [
          "Giải thích vì sao tôi làm sai quiz này.",
          "Tôi nên ôn lại khái niệm nào trước?",
          "Cho tôi kế hoạch ôn lại ngắn trước khi làm lại quiz.",
        ],
        currentPath,
        courseId,
        lessonId,
      },
    });
  };

  return (
    <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <Badge className="ai-badge ai-badge--advisory px-3 py-1">
              <Sparkles className="size-3.5" />
              Phân tích lỗi AI
            </Badge>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Phân tích các điểm bạn vừa làm sai và gợi ý cách ôn lại ngay trên lesson hiện tại.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full rounded-full sm:w-auto"
            onClick={loadReview}
          >
            <RefreshCcw className="size-4" />
            Làm mới
          </Button>
        </div>

        {loading ? (
          <AiSurfaceState
            state="loading"
            title="Đang tổng hợp Phân tích lỗi AI"
            description="AI đang gom lỗi, khái niệm cần ôn lại và các lesson nên xem tiếp theo."
          />
        ) : error ? (
          <AiSurfaceState
            state="error"
            title="Không thể tải Phân tích lỗi AI"
            description={error}
            actionLabel="Thử lại"
            onAction={loadReview}
          />
        ) : data ? (
          <>
            <div
              className={
                data.review_state === "perfect_attempt"
                  ? "rounded-[24px] border border-emerald-200 bg-emerald-50 p-4"
                  : "rounded-[24px] border border-slate-200 bg-slate-50/80 p-4"
              }
            >
              <div className="flex items-start gap-3">
                <span
                  className={
                    data.review_state === "perfect_attempt"
                      ? "inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"
                      : "inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"
                  }
                >
                  {data.review_state === "perfect_attempt" ? (
                    <CheckCircle2 className="size-5" />
                  ) : (
                    <Target className="size-5" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-sm leading-7 text-slate-700">{data.summary}</p>
                </div>
              </div>
            </div>

            {data.mistake_clusters.length > 0 ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {data.mistake_clusters.map((cluster) => (
                  <div
                    key={`${cluster.title}-${cluster.question_ids.join("-")}`}
                    className="rounded-[22px] border border-slate-200 bg-white p-4"
                  >
                    <p className="text-sm font-semibold text-slate-900">{cluster.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{cluster.description}</p>
                    <p className="mt-3 text-xs text-slate-400">Câu liên quan: {cluster.question_ids.join(", ")}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {data.concepts_to_review.length > 0 ? (
              <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">Khái niệm nên ôn lại</p>
                <div className="mt-3 space-y-3">
                  {data.concepts_to_review.map((concept) => (
                    <div
                      key={concept.title}
                      className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900">{concept.title}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{concept.reason}</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                      className="w-full rounded-full sm:w-auto"
                        onClick={() =>
                          openQuizChat(`Giải thích lại khái niệm "${concept.title}" và vì sao tôi dễ nhầm trong quiz này.`)
                        }
                      >
                        Ôn lại khái niệm
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {data.lessons_to_revisit.length > 0 ? (
              <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">Bài học nên xem lại</p>
                <div className="mt-3 grid gap-3">
                  {data.lessons_to_revisit.map((item) => (
                    <Link
                      key={`${item.cta_href}-${item.title}`}
                      href={item.cta_href}
                      className="rounded-[20px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
                      onClick={() =>
                        trackAiEvent("mistake_review_cta_click", {
                          action: "open_related_lesson",
                          quiz_id: quizId,
                          attempt_id: attemptId,
                          href: item.cta_href,
                        })
                      }
                    >
                      <div className="flex items-start gap-3">
                        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                          <BookOpenCheck className="size-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-slate-900">{item.title}</span>
                          <span className="mt-1 block text-sm leading-6 text-slate-600">{item.reason}</span>
                          <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-cyan-700">
                            Mở bài học
                            <ArrowUpRight className="size-3.5" />
                          </span>
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            {data.recovery_plan.length > 0 ? (
              <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">Kế hoạch ôn lại ngắn</p>
                <ol className="mt-3 space-y-2 pl-5 text-sm leading-6 text-slate-700">
                  {data.recovery_plan.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
            ) : null}

            <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                className="ai-action-primary w-full rounded-full sm:w-auto"
                onClick={() =>
                  openQuizChat("Giải thích vì sao tôi làm sai quiz này và nên ôn lại theo thứ tự nào.")
                }
              >
                Hỏi AI vì sao tôi làm sai
              </Button>
              {onRetry ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-full sm:w-auto"
                  onClick={() => {
                    trackAiEvent("mistake_review_cta_click", {
                      action: "retake_quiz",
                      quiz_id: quizId,
                      attempt_id: attemptId,
                    });
                    onRetry();
                  }}
                >
                  Làm lại quiz sau khi ôn
                </Button>
              ) : null}
            </div>

            {data.follow_up_prompts.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.follow_up_prompts.map((prompt) => (
                  <Button
                    key={prompt}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-auto max-w-full rounded-full whitespace-normal [overflow-wrap:anywhere]"
                    onClick={() => openQuizChat(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <AiSurfaceState
            state="empty"
            title="Chưa có Phân tích lỗi AI"
            description="Lượt làm hiện tại chưa có đủ dữ liệu để tạo review có cấu trúc."
          />
        )}
      </CardContent>
    </Card>
  );
}
