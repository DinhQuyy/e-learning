"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  LifeBuoy,
  Loader2,
  MessageSquare,
  Search,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiPost } from "@/lib/api-fetch";
import type { HelpdeskResponse, HelpdeskSuggestionsResponse } from "@/lib/ai-schemas";

type SuggestionItem = HelpdeskSuggestionsResponse["items"][number];

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("đ", "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function formatError(status: number, message: string | null): string {
  if (status === 401) return "Bạn cần đăng nhập để sử dụng Trợ giúp AI.";
  if (status === 429) return "Bạn đang gửi quá nhanh. Vui lòng thử lại sau ít phút.";
  if (message?.trim()) return message;
  return "Không thể gọi AI Helpdesk. Vui lòng thử lại.";
}

export function AiHelpdeskWidget({ currentPath }: { currentPath?: string } = {}) {
  const pathname = usePathname();
  const resolvedPath = currentPath ?? pathname ?? "";
  const isAdminPath = resolvedPath.startsWith("/admin");

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HelpdeskResponse | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [assistantMessageId, setAssistantMessageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState<1 | -1 | null>(null);

  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [hasLoadedSuggestions, setHasLoadedSuggestions] = useState(false);

  const normalizedQuery = useMemo(() => normalizeForMatch(query), [query]);
  const hasExactSuggestion = useMemo(
    () => suggestions.some((item) => normalizeForMatch(item.question) === normalizedQuery),
    [normalizedQuery, suggestions]
  );

  useEffect(() => {
    if (!open || isAdminPath) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSuggestionsLoading(true);

      try {
        const params = new URLSearchParams({
          q: query.trim(),
          limit: query.trim() ? "8" : "10",
        });
        const res = await apiGet(`/api/ai/helpdesk/suggestions?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          return;
        }
        const payload = (await res.json().catch(() => null)) as HelpdeskSuggestionsResponse | null;
        const items = Array.isArray(payload?.items) ? payload.items : [];
        setSuggestions(items);
        setHasLoadedSuggestions(true);
      } catch {
        // Ignore fetch abort and transient suggestion errors.
      } finally {
        setSuggestionsLoading(false);
      }
    }, query.trim() ? 180 : 0);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [open, query, isAdminPath]);

  async function handleAsk(nextQuery?: string) {
    const askText = (nextQuery ?? query).trim();
    if (!askText) return;

    setLoading(true);
    setError(null);
    if (nextQuery) {
      setQuery(askText);
    }

    try {
      const res = await apiPost("/api/ai/helpdesk", {
        query: askText,
        current_path: currentPath ?? pathname ?? "/",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(formatError(res.status, typeof err?.error === "string" ? err.error : null));
      }

      const payload = await res.json();
      setResult(payload?.data ?? null);
      setConversationId(
        typeof payload?.meta?.conversation_id === "string" ? payload.meta.conversation_id : null
      );
      setAssistantMessageId(
        typeof payload?.meta?.assistant_message_id === "string"
          ? payload.meta.assistant_message_id
          : null
      );
      setFeedbackDone(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi không xác định.");
    } finally {
      setLoading(false);
    }
  }

  async function submitFeedback(rating: 1 | -1) {
    if (!conversationId || !assistantMessageId || feedbackLoading) return;

    setFeedbackLoading(true);
    try {
      const res = await apiPost("/api/ai/feedback", {
        conversation_id: conversationId,
        assistant_message_id: assistantMessageId,
        mode: "helpdesk",
        rating,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(formatError(res.status, typeof err?.error === "string" ? err.error : null));
      }

      setFeedbackDone(rating);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gửi phản hồi thất bại.");
    } finally {
      setFeedbackLoading(false);
    }
  }

  const refusalSuggestions = result?.suggested_questions ?? [];

  if (isAdminPath) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="fixed bottom-5 right-5 z-50 h-11 rounded-full bg-slate-900 px-4 text-white shadow-[0_16px_32px_-14px_rgba(15,23,42,0.65)] hover:bg-slate-800"
          size="default"
        >
          <span className="mr-2 inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <LifeBuoy className="mr-2 size-4" />
          Trợ giúp AI
        </Button>
      </DialogTrigger>

      <DialogContent className="overflow-hidden border-0 p-0 shadow-2xl sm:max-w-2xl">
        <DialogTitle className="sr-only">Trợ giúp AI</DialogTitle>

        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-900 px-5 py-4 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-1 flex items-center gap-2 text-sm font-medium text-cyan-200">
                <Sparkles className="size-4" />
                Trợ lý Helpdesk AI
              </p>
              <h3 className="text-lg font-semibold">Hỏi đáp thao tác theo bộ câu hỏi chuẩn</h3>
              <p className="mt-1 text-sm text-slate-200">
                Gợi ý tự động theo danh sách QA đã duyệt, giúp bạn hỏi đúng và nhận kết quả nhanh.
              </p>
            </div>
            <Badge className="bg-white/15 text-white hover:bg-white/15">Strict QA</Badge>
          </div>
        </div>

        <div className="max-h-[78vh] space-y-5 overflow-y-auto p-5">
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
            <label className="text-sm font-medium text-slate-800">Câu hỏi của bạn</label>
            <div className="relative">
              <Textarea
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ví dụ: Duyệt đơn trở thành giảng viên ở đâu?"
                rows={3}
                className="resize-none border-slate-300 bg-white pr-10"
              />
              <Search className="absolute right-3 top-3 size-4 text-slate-400" />
            </div>

            <Button
              onClick={() => handleAsk()}
              disabled={loading || !query.trim()}
              className="w-full bg-slate-900 text-white hover:bg-slate-800"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <MessageSquare className="mr-2 size-4" />
                  Gửi câu hỏi
                </>
              )}
            </Button>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {query.trim() ? "Gợi ý gần nhất" : "Câu hỏi phổ biến"}
                </p>
                {suggestionsLoading ? (
                  <span className="text-xs text-slate-500">Đang cập nhật...</span>
                ) : hasLoadedSuggestions ? (
                  <span className="text-xs text-slate-500">{suggestions.length} gợi ý</span>
                ) : null}
              </div>

              {suggestions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((item) => {
                    const isExact = normalizeForMatch(item.question) === normalizedQuery;
                    return (
                      <Button
                        key={`${item.question}-${item.deep_link}`}
                        type="button"
                        size="sm"
                        variant={isExact ? "default" : "outline"}
                        className="h-8 rounded-full text-xs"
                        onClick={() => void handleAsk(item.question)}
                      >
                        {isExact ? <CheckCircle2 className="mr-1.5 size-3.5" /> : null}
                        {item.question}
                      </Button>
                    );
                  })}
                </div>
              ) : hasLoadedSuggestions && !suggestionsLoading ? (
                <p className="text-xs text-slate-500">
                  Chưa có gợi ý phù hợp. Vui lòng thử từ khóa ngắn hơn.
                </p>
              ) : null}

              {query.trim() && !hasExactSuggestion && suggestions.length > 0 ? (
                <p className="text-xs text-amber-700">
                  Câu bạn gõ chưa trùng hoàn toàn bộ QA. Nên chọn một câu gợi ý để nhận trả lời chính xác.
                </p>
              ) : null}
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              <p className="flex items-center gap-2 font-medium">
                <CircleAlert className="size-4" />
                {error}
              </p>
            </div>
          ) : null}

          {result ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-cyan-700">Kết quả</p>
                <h4 className="text-base font-semibold text-slate-900">{result.answer_title}</h4>
              </div>

              <div className="space-y-2">
                {result.steps.map((step, index) => (
                  <div key={`${step.title}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="mb-1 text-sm font-semibold text-slate-900">
                      Bước {index + 1}: {step.title}
                    </p>
                    <p className="text-sm text-slate-600">{step.detail}</p>
                    <a
                      href={step.deep_link}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-cyan-700 hover:underline"
                    >
                      Mở trang thao tác
                      <ArrowUpRight className="size-3.5" />
                    </a>
                  </div>
                ))}
              </div>

              {result.common_issues.length > 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="mb-2 text-sm font-semibold text-amber-900">Lỗi thường gặp</p>
                  <div className="space-y-2">
                    {result.common_issues.map((issue, index) => (
                      <div key={`${issue.symptom}-${index}`} className="rounded-lg bg-white/80 p-3">
                        <p className="text-sm font-medium text-slate-900">{issue.symptom}</p>
                        <p className="mt-1 text-xs text-slate-700">Nguyên nhân: {issue.cause}</p>
                        <p className="text-xs text-slate-700">Cách khắc phục: {issue.fix}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {refusalSuggestions.length > 0 ? (
                <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                  <p className="mb-2 text-sm font-semibold text-sky-900">Bạn có muốn hỏi một trong các câu sau?</p>
                  <div className="flex flex-wrap gap-2">
                    {refusalSuggestions.map((item) => (
                      <Button
                        key={`refusal-${item.question}-${item.deep_link}`}
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-full border-sky-300 bg-white text-xs text-sky-900 hover:bg-sky-100"
                        onClick={() => void handleAsk(item.question)}
                      >
                        {item.question}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}

              {conversationId && assistantMessageId ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-3 text-xs text-slate-600">
                    Đánh giá phản hồi để AI học phong cách hỗ trợ của bạn.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={feedbackDone === 1 ? "default" : "outline"}
                      onClick={() => submitFeedback(1)}
                      disabled={feedbackLoading}
                      className="gap-1.5"
                    >
                      <ThumbsUp className="size-4" />
                      Hữu ích
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={feedbackDone === -1 ? "destructive" : "outline"}
                      onClick={() => submitFeedback(-1)}
                      disabled={feedbackLoading}
                      className="gap-1.5"
                    >
                      <ThumbsDown className="size-4" />
                      Chưa hữu ích
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="mb-1 font-medium text-slate-800">Mẹo dùng nhanh</p>
              <p>
                Chọn một câu trong danh sách gợi ý để hệ thống map đúng bộ QA và trả kết quả ngay lập tức.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
