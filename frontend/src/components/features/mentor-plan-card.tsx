"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Loader2,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch, apiPost } from "@/lib/api-fetch";
import type { MentorResponse } from "@/lib/ai-schemas";

export function MentorPlanCard({ courseIds }: { courseIds: string[] }) {
  const [data, setData] = useState<MentorResponse | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [assistantMessageId, setAssistantMessageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState<1 | -1 | null>(null);
  const [dismissedRecommendationIds, setDismissedRecommendationIds] = useState<Set<string>>(
    () => new Set()
  );
  const clickedRecommendationIds = useRef<Set<string>>(new Set());

  const resolvedCourseIds = useMemo(
    () => Array.from(new Set(courseIds.filter(Boolean))),
    [courseIds]
  );
  const courseIdsKey = resolvedCourseIds.join(",");

  useEffect(() => {
    if (resolvedCourseIds.length === 0) return;

    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch(
          `/api/ai/mentor?courseIds=${encodeURIComponent(courseIdsKey)}`
        );
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.error || "Không thể tải mentor plan");
        }
        const payload = await res.json();
        if (mounted) {
          setData(payload?.data ?? null);
          setConversationId(
            typeof payload?.meta?.conversation_id === "string"
              ? payload.meta.conversation_id
              : null
          );
          setAssistantMessageId(
            typeof payload?.meta?.assistant_message_id === "string"
              ? payload.meta.assistant_message_id
              : null
          );
          clickedRecommendationIds.current.clear();
          setDismissedRecommendationIds(new Set());
          setFeedbackDone(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Loi khong xac dinh");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [courseIdsKey, resolvedCourseIds.length]);

  async function submitFeedback(rating: 1 | -1) {
    if (!conversationId || !assistantMessageId || feedbackLoading) {
      return;
    }

    setFeedbackLoading(true);
    try {
      const res = await apiPost("/api/ai/feedback", {
        conversation_id: conversationId,
        assistant_message_id: assistantMessageId,
        mode: "mentor",
        rating,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Không thể gửi feedback");
      }
      setFeedbackDone(rating);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gui feedback that bai");
    } finally {
      setFeedbackLoading(false);
    }
  }

  async function trackRecommendationClick(recommendationId: string | null | undefined) {
    const resolvedRecommendationId =
      typeof recommendationId === "string" ? recommendationId : "";
    if (!resolvedRecommendationId) return;
    if (clickedRecommendationIds.current.has(resolvedRecommendationId)) return;

    clickedRecommendationIds.current.add(resolvedRecommendationId);
    try {
      const res = await apiPost("/api/ai/mentor/recommendation-click", {
        recommendation_id: resolvedRecommendationId,
      });
      if (!res.ok) {
        clickedRecommendationIds.current.delete(resolvedRecommendationId);
      }
    } catch {
      clickedRecommendationIds.current.delete(resolvedRecommendationId);
    }
  }

  async function dismissRecommendation(recommendationId: string | null | undefined) {
    const resolvedRecommendationId =
      typeof recommendationId === "string" ? recommendationId : "";
    if (!resolvedRecommendationId) return;
    if (dismissedRecommendationIds.has(resolvedRecommendationId)) return;

    try {
      const res = await apiPost("/api/ai/mentor/recommendation-dismiss", {
        recommendation_id: resolvedRecommendationId,
        reason: "hidden_from_dashboard",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Khong the an goi y nay");
      }
      setDismissedRecommendationIds((prev) => {
        const next = new Set(prev);
        next.add(resolvedRecommendationId);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong the an goi y nay");
    }
  }

  const visibleTodayPlan = useMemo(
    () =>
      (data?.today_plan ?? []).filter((item) => {
        if (!item.recommendation_id) return true;
        return !dismissedRecommendationIds.has(item.recommendation_id);
      }),
    [data?.today_plan, dismissedRecommendationIds]
  );

  const visibleOverdue = useMemo(
    () =>
      (data?.overdue ?? []).filter((item) => {
        if (!item.recommendation_id) return true;
        return !dismissedRecommendationIds.has(item.recommendation_id);
      }),
    [data?.overdue, dismissedRecommendationIds]
  );

  if (resolvedCourseIds.length === 0) {
    return null;
  }

  return (
    <Card className="border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="size-4 text-blue-600" />
            AI Mentor
          </CardTitle>
          {data?.metrics ? (
            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="rounded-full bg-white px-3 py-1 shadow-sm">
                {data.metrics.active_courses ?? resolvedCourseIds.length} khoa dang hoc
              </span>
              <span className="rounded-full bg-white px-3 py-1 shadow-sm">
                {data.metrics.weekly_minutes ?? 0} phut / 7 ngay
              </span>
              <span className="rounded-full bg-white px-3 py-1 shadow-sm">
                streak {data.metrics.streak_days} ngay
              </span>
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Dang tao ke hoach hoc uu tien cho ban...
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {data ? (
          <>
            <p className="text-sm text-slate-700">{data.summary}</p>

            {conversationId && assistantMessageId ? (
              <div className="rounded-lg border bg-white p-3">
                <p className="mb-2 text-xs text-muted-foreground">
                  Danh gia mentor nay de he thong hoc cach goi y phu hop hon
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={feedbackDone === 1 ? "default" : "outline"}
                    onClick={() => submitFeedback(1)}
                    disabled={feedbackLoading}
                    className="gap-1"
                  >
                    <ThumbsUp className="size-4" />
                    Huu ich
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={feedbackDone === -1 ? "destructive" : "outline"}
                    onClick={() => submitFeedback(-1)}
                    disabled={feedbackLoading}
                    className="gap-1"
                  >
                    <ThumbsDown className="size-4" />
                    Chua huu ich
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              {visibleTodayPlan.map((plan, index) => (
                <div
                  key={`${plan.recommendation_id ?? plan.task}-${index}`}
                  className="rounded-lg border bg-white p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{plan.task}</p>
                      {plan.course_title ? (
                        <p className="mt-1 text-xs font-medium text-blue-700">
                          {plan.course_title}
                        </p>
                      ) : null}
                    </div>
                    {plan.risk_band ? (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-600">
                        {plan.risk_band}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{plan.why}</p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">
                      ETA: {plan.eta_min} phut
                    </span>
                    <div className="flex items-center gap-2">
                      {plan.recommendation_id ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-8 text-slate-500"
                          onClick={() => {
                            void dismissRecommendation(plan.recommendation_id);
                          }}
                        >
                          <X className="size-4" />
                          <span className="sr-only">An goi y</span>
                        </Button>
                      ) : null}
                      <Button asChild size="sm" variant="outline">
                        <Link
                          href={plan.cta.href}
                          onClick={() => {
                            void trackRecommendationClick(plan.recommendation_id);
                          }}
                        >
                          {plan.cta.label}
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {visibleOverdue.length > 0 ? (
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                  <AlertTriangle className="size-4" />
                  Co khoa hoc dang mat nhip
                </p>
                {visibleOverdue.map((item, index) => (
                  <div
                    key={`${item.recommendation_id ?? item.lesson_id}-${index}`}
                    className="rounded-lg border border-amber-200 bg-amber-50 p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{item.title}</p>
                        {item.course_title ? (
                          <p className="mt-1 text-xs font-medium text-amber-800">
                            {item.course_title}
                          </p>
                        ) : null}
                      </div>
                      {item.risk_band ? (
                        <span className="rounded-full bg-white px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-amber-700">
                          {item.risk_band}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-amber-700">{item.reason}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      {item.recommendation_id ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-8 text-amber-700"
                          onClick={() => {
                            void dismissRecommendation(item.recommendation_id);
                          }}
                        >
                          <X className="size-4" />
                          <span className="sr-only">An goi y</span>
                        </Button>
                      ) : (
                        <span />
                      )}
                      <Button asChild size="sm" variant="outline">
                        <Link
                          href={item.cta.href}
                          onClick={() => {
                            void trackRecommendationClick(item.recommendation_id);
                          }}
                        >
                          {item.cta.label}
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
