"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BellRing, CalendarDays, Sparkles, Target } from "lucide-react";

import { AiPageContextBridge, useAiUi } from "@/components/providers/ai-ui-provider";
import { AiSurfaceState } from "@/components/features/ai-surface-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiGet } from "@/lib/api-fetch";
import { trackAiEvent } from "@/lib/ai-tracking";
import type { DashboardCoachResponse } from "@/lib/ai-schemas";

function formatDuration(seconds: number): string {
  const totalMinutes = Math.max(0, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours} giờ ${minutes} phút`;
  }
  return `${minutes} phút`;
}

function buildWhySuggestionPrompt(data: DashboardCoachResponse) {
  const nextAction = data.next_action;
  return `Giải thích vì sao bạn gợi ý "${nextAction.title}" là bước học tiếp theo. Dữ liệu hiện có: ${nextAction.body}`;
}

function buildReminderPrompt(data: DashboardCoachResponse) {
  if (data.reminders.length === 0) {
    return "Tôi nên ưu tiên việc học nào tiếp theo trên dashboard?";
  }
  return `Giải thích các nhắc việc này theo thứ tự ưu tiên: ${data.reminders
    .map((item) => `${item.title} - ${item.body}`)
    .join(" | ")}`;
}

export function DashboardAiCoach() {
  const [data, setData] = useState<DashboardCoachResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { openChat } = useAiUi();

  useEffect(() => {
    let active = true;

    async function loadCoach() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiGet("/api/ai/dashboard-coach");
        const payload = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(
            typeof payload?.error === "string" ? payload.error : "Không thể tải Huấn luyện viên học tập AI."
          );
        }
        if (active) {
          setData(payload?.data ?? null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Không thể tải Huấn luyện viên học tập AI.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadCoach();
    return () => {
      active = false;
    };
  }, []);

  const pageContextValue = useMemo(
    () => ({
      surface: "dashboard_coach" as const,
      title: "Huấn luyện viên học tập AI",
      description: "Gợi ý học tiếp, nhắc việc còn dở và hỗ trợ theo ngữ cảnh dashboard.",
      starterPrompts: data?.help_prompts ?? [
        "Giải thích vì sao đây là bài học nên học tiếp.",
        "Tôi đang chậm ở khóa nào?",
        "Làm sao xem tiến độ học tập trong hệ thống?",
      ],
    }),
    [data]
  );

  return (
    <>
      <AiPageContextBridge value={pageContextValue} />
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#eef6ff_50%,#f5fbff_100%)] shadow-[0_20px_48px_-32px_rgba(15,23,42,0.38)]">
        <div className="border-b border-slate-200/80 px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Badge className="ai-badge ai-badge--advisory px-3 py-1">
                <Sparkles className="size-3.5" />
                Huấn luyện viên học tập AI
              </Badge>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                Học gì tiếp theo, thấy ngay
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Gợi ý này dựa trên tiến độ, bài đang dở và nhịp học trong 7 ngày gần nhất.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="px-5 py-5 md:px-6">
            <AiSurfaceState
              state="loading"
              title="Đang tải Huấn luyện viên học tập AI"
              description="Đang tổng hợp gợi ý học tiếp, nhắc việc còn dở và nhịp học trong 7 ngày gần nhất."
            />
          </div>
        ) : error ? (
          <div className="px-5 py-5 md:px-6">
            <Card className="rounded-[24px] border-rose-200 bg-rose-50">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <p className="text-sm font-semibold text-rose-800">Không thể tải Huấn luyện viên học tập AI</p>
                  <p className="mt-1 text-sm text-rose-700">{error}</p>
                </div>
                <Button type="button" variant="outline" className="rounded-full" onClick={() => window.location.reload()}>
                  Tải lại
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : data ? (
          <div className="grid gap-4 px-5 py-5 md:grid-cols-[1.3fr_1fr] md:px-6">
            <Card className="rounded-[24px] border-slate-200/80 bg-white/95 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2f57ef]">
                      Nên học gì hôm nay
                    </p>
                    <h3 className="mt-3 text-xl font-semibold text-slate-950">
                      {data.next_action.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{data.next_action.body}</p>
                  </div>
                  <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-[#eef3ff] text-[#2f57ef]">
                    <Target className="size-5" />
                  </span>
                </div>

                {typeof data.next_action.progress_percent === "number" ? (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Tiến độ hiện tại</span>
                      <span className="font-semibold text-slate-700">
                        {data.next_action.progress_percent}%
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#2f57ef,#0ea5e9)]"
                        style={{ width: `${Math.min(100, data.next_action.progress_percent)}%` }}
                      />
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
                  <Button
                    asChild
                    className="ai-action-primary w-full rounded-full sm:w-auto"
                    onClick={() =>
                      trackAiEvent("coach_cta_click", { action: "continue_learning", block: "next_action" })
                    }
                  >
                    <Link href={data.next_action.cta_href}>
                      {data.next_action.cta_label}
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-full sm:w-auto"
                    onClick={() => {
                      trackAiEvent("coach_cta_click", { action: "why_this_suggestion", block: "next_action" });
                      openChat({ prefill: buildWhySuggestionPrompt(data) });
                    }}
                  >
                    Vì sao gợi ý này?
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4">
              <Card className="rounded-[24px] border-slate-200/80 bg-white/95 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Nhắc việc
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-slate-950">Nhắc việc còn dở</h3>
                    </div>
                    <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                      <BellRing className="size-5" />
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {data.reminders.length === 0 ? (
                      <div className="rounded-[20px] border border-dashed border-slate-200 px-4 py-4 text-sm text-slate-500">
                        Hiện chưa có nhắc việc nào. Bạn đang theo khá sát tiến độ hiện tại.
                      </div>
                    ) : (
                      data.reminders.map((reminder) => (
                        <div
                          key={`${reminder.type}-${reminder.title}`}
                          className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-4"
                        >
                          <p className="text-sm font-semibold text-slate-900">{reminder.title}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{reminder.body}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="rounded-full bg-white"
                              onClick={() =>
                                trackAiEvent("coach_cta_click", {
                                  action: "open_course",
                                  block: "reminders",
                                  reminder_type: reminder.type,
                                })
                              }
                            >
                              <Link href={reminder.cta_href}>{reminder.cta_label}</Link>
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    className="mt-4 justify-start rounded-full px-0 text-[#2f57ef] hover:bg-transparent"
                    onClick={() => {
                      trackAiEvent("coach_cta_click", { action: "ask_ai", block: "reminders" });
                      openChat({ prefill: buildReminderPrompt(data) });
                    }}
                  >
                    Hỏi AI
                    <ArrowRight className="size-4" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-[24px] border-slate-200/80 bg-white/95 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Tiến độ 7 ngày
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-slate-950">Nhịp học 7 ngày gần đây</h3>
                    </div>
                    <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                      <CalendarDays className="size-5" />
                    </span>
                  </div>

                  <div className="mt-4 rounded-[20px] border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-3xl font-bold tracking-tight text-slate-950">
                      {formatDuration(data.weekly_progress.studied_seconds_7d)}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {data.weekly_progress.active_days_7d} ngày có học trong 7 ngày gần nhất.
                    </p>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#10b981,#0ea5e9)]"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(
                              (data.weekly_progress.studied_seconds_7d /
                                Math.max(data.weekly_progress.target_seconds, 1)) *
                                100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="mt-3 text-sm text-slate-500">
                      Mục tiêu mặc định: {formatDuration(data.weekly_progress.target_seconds)} mỗi tuần.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="px-5 py-5 md:px-6">
            <AiSurfaceState
              state="empty"
              title="Chưa có Huấn luyện viên học tập AI"
              description="Hiện chưa tạo được gợi ý học tập cho dashboard này. Hãy tải lại hoặc thử lại sau."
              actionLabel="Tải lại"
              onAction={() => window.location.reload()}
            />
          </div>
        )}
      </section>
    </>
  );
}
