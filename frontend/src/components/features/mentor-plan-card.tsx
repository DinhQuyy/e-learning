"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch, apiPost } from "@/lib/api-fetch";
import type { MentorResponse } from "@/lib/ai-schemas";

export function MentorPlanCard({ courseId }: { courseId: string | null }) {
  const [data, setData] = useState<MentorResponse | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [assistantMessageId, setAssistantMessageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState<1 | -1 | null>(null);

  useEffect(() => {
    if (!courseId) return;
    const resolvedCourseId = courseId;

    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch(
          `/api/ai/mentor?courseId=${encodeURIComponent(resolvedCourseId)}`
        );
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.error || "Khong the tai mentor plan");
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

    load();

    return () => {
      mounted = false;
    };
  }, [courseId]);

  if (!courseId) {
    return null;
  }

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
        throw new Error(err?.error || "Khong the gui feedback");
      }
      setFeedbackDone(rating);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gui feedback that bai");
    } finally {
      setFeedbackLoading(false);
    }
  }

  return (
    <Card className="border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="size-4 text-blue-600" />
          AI Mentor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Dang tao ke hoach hoc hom nay...
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {data ? (
          <>
            <p className="text-sm text-slate-700">{data.summary}</p>

            {conversationId && assistantMessageId ? (
              <div className="rounded-lg border bg-white p-3">
                <p className="mb-2 text-xs text-muted-foreground">
                  Danh gia ke hoach nay de AI mentor hoc phong cach cua ban
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
              {data.today_plan.map((plan, index) => (
                <div key={`${plan.task}-${index}`} className="rounded-lg border bg-white p-3">
                  <p className="text-sm font-medium">{plan.task}</p>
                  <p className="text-xs text-muted-foreground">{plan.why}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">ETA: {plan.eta_min} phut</span>
                    <Button asChild size="sm" variant="outline">
                      <Link href={plan.cta.href}>{plan.cta.label}</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {data.overdue.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-amber-700">Overdue</p>
                {data.overdue.map((item, index) => (
                  <div key={`${item.lesson_id}-${index}`} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-amber-700">{item.reason}</p>
                    <Button asChild size="sm" variant="outline" className="mt-2">
                      <Link href={item.cta.href}>{item.cta.label}</Link>
                    </Button>
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
