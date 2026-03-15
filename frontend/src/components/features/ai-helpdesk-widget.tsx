"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  BookOpen,
  CircleAlert,
  FileText,
  Layers3,
  LifeBuoy,
  Loader2,
  MessageSquare,
  Search,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiPost } from "@/lib/api-fetch";
import type { AssistantResponse, AssistantSuggestionsResponse } from "@/lib/ai-schemas";

type AssistantMode = "auto" | "helpdesk" | "references";
type ReferenceLevel = "basic" | "intermediate" | "advanced";
type SuggestionItem = AssistantSuggestionsResponse["items"][number];
type ReferenceSourceType = Exclude<SuggestionItem["source_type"], null | undefined>;

const LEVEL_OPTIONS: Array<{ value: ReferenceLevel; label: string }> = [
  { value: "basic", label: "Cơ bản" },
  { value: "intermediate", label: "Trung cấp" },
  { value: "advanced", label: "Nâng cao" },
];

const MODE_OPTIONS: Array<{ value: AssistantMode; label: string; description: string }> = [
  { value: "auto", label: "Tự động", description: "AI tự phân luồng câu hỏi." },
  { value: "helpdesk", label: "Hỗ trợ", description: "Dùng khi gặp lỗi hoặc vướng thao tác." },
  { value: "references", label: "Tài liệu", description: "Dùng khi cần tìm course, module, lesson theo chủ đề." },
];

const SOURCE_BADGES: Record<ReferenceSourceType, { label: string; className: string; Icon: typeof BookOpen }> = {
  references: { label: "Course", className: "bg-emerald-50 text-emerald-700 ring-emerald-200", Icon: BookOpen },
  course_module: { label: "Module", className: "bg-amber-50 text-amber-700 ring-amber-200", Icon: Layers3 },
  course_lesson: { label: "Lesson", className: "bg-cyan-50 text-cyan-700 ring-cyan-200", Icon: FileText },
  quiz: { label: "Quiz", className: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200", Icon: FileText },
};

const HIDDEN_WIDGET_PATH_PREFIXES = ["/admin", "/login", "/register", "/forgot-password", "/reset-password"];

function normalizeForMatch(value: string): string {
  return value
    .replaceAll("đ", "d")
    .replaceAll("Đ", "D")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function formatLevel(level: string): string {
  const safe = level.trim().toLowerCase();
  if (safe === "basic") return "Cơ bản";
  if (safe === "intermediate") return "Trung cấp";
  if (safe === "advanced") return "Nâng cao";
  return level;
}

function formatMode(mode: AssistantMode): string {
  if (mode === "helpdesk") return "Hỗ trợ";
  if (mode === "references") return "Tài liệu";
  return "Tự động";
}

function formatResolvedMode(mode: AssistantResponse["resolved_mode"]): string {
  if (mode === "helpdesk") return "Hỗ trợ hệ thống";
  if (mode === "references") return "Tài liệu học";
  return "Cần xác nhận";
}

function formatError(status: number, message: string | null): string {
  if (status === 401) return "Bạn cần đăng nhập để sử dụng Trợ lý AI.";
  if (status === 403) return "Bạn chưa có quyền truy cập dữ liệu này.";
  if (status === 429) return "Bạn gửi yêu cầu quá nhanh. Vui lòng thử lại sau ít phút.";
  if (message?.trim()) return message;
  return "Không thể gọi AI lúc này. Vui lòng thử lại.";
}

function inferSourceType(sourceType: SuggestionItem["source_type"], url: string): ReferenceSourceType {
  if (sourceType && sourceType in SOURCE_BADGES) return sourceType as ReferenceSourceType;
  const safeUrl = url.trim().toLowerCase();
  if (safeUrl.includes("/learn/")) return "course_lesson";
  if (safeUrl.includes("module=") || safeUrl.includes("#module-")) return "course_module";
  if (safeUrl.includes("quiz")) return "quiz";
  return "references";
}

function suggestionMeta(item: SuggestionItem): string {
  if (item.kind === "helpdesk") return item.description || "Câu hỏi hỗ trợ trong hệ thống.";
  const parts: string[] = [];
  if (item.source_type !== "references" && item.course_title) parts.push(item.course_title);
  if (item.category) parts.push(item.category);
  if (item.level) parts.push(formatLevel(item.level));
  return parts.join(" • ") || item.description || "Tài liệu đã có trong dự án.";
}

function rotateSuggestions<T>(items: T[], seed: number): T[] {
  if (items.length < 2) return items;
  const offset = Math.abs(seed) % items.length;
  if (offset === 0) return items;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

function AssistantLoadingState() {
  return (
    <div className="min-h-[420px] rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.1),_transparent_35%),#f8fafc] p-5">
      <div className="h-7 w-24 animate-pulse rounded-full bg-white shadow-sm ring-1 ring-cyan-100" />
      <div className="mt-4 h-8 w-3/5 animate-pulse rounded-2xl bg-slate-200" />
      <div className="mt-3 h-4 w-1/2 animate-pulse rounded-full bg-slate-200/80" />

      <div className="mt-8 grid gap-3 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={`assistant-loading-${index}`} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="h-6 w-16 animate-pulse rounded-full bg-slate-100" />
              <div className="h-6 w-20 animate-pulse rounded-full bg-slate-100" />
            </div>
            <div className="mt-4 h-5 w-4/5 animate-pulse rounded-xl bg-slate-200" />
            <div className="mt-3 h-4 w-full animate-pulse rounded-full bg-slate-100" />
            <div className="mt-2 h-4 w-11/12 animate-pulse rounded-full bg-slate-100" />
            <div className="mt-2 h-4 w-2/3 animate-pulse rounded-full bg-slate-100" />
            <div className="mt-5 h-4 w-24 animate-pulse rounded-full bg-cyan-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AiHelpdeskWidget({ currentPath }: { currentPath?: string } = {}) {
  const pathname = usePathname();
  const resolvedPath = currentPath ?? pathname ?? "";
  const shouldHideWidget = HIDDEN_WIDGET_PATH_PREFIXES.some((prefix) => resolvedPath.startsWith(prefix));

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<AssistantMode>("auto");
  const [level, setLevel] = useState<ReferenceLevel>("basic");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AssistantResponse | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [assistantMessageId, setAssistantMessageId] = useState<string | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState<1 | -1 | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [hasLoadedSuggestions, setHasLoadedSuggestions] = useState(false);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [suggestionSeed, setSuggestionSeed] = useState(0);

  const normalizedQuery = useMemo(() => normalizeForMatch(query), [query]);
  const helpdeskSuggestions = useMemo(() => suggestions.filter((item) => item.kind === "helpdesk"), [suggestions]);
  const referenceSuggestions = useMemo(() => suggestions.filter((item) => item.kind === "references"), [suggestions]);
  const canUseLevel = mode !== "helpdesk";
  const isQueryEmpty = query.trim().length === 0;
  const isSearching = !isQueryEmpty;
  const randomizedReferenceSuggestions = useMemo(
    () => (isSearching ? referenceSuggestions : rotateSuggestions(referenceSuggestions, suggestionSeed + 1)),
    [referenceSuggestions, isSearching, suggestionSeed]
  );
  const randomizedHelpdeskSuggestions = useMemo(
    () => (isSearching ? helpdeskSuggestions : rotateSuggestions(helpdeskSuggestions, suggestionSeed + 3)),
    [helpdeskSuggestions, isSearching, suggestionSeed]
  );
  const referenceSuggestionLimit = mode === "references" ? 8 : mode === "helpdesk" ? 3 : isSearching ? 5 : 6;
  const helpdeskSuggestionLimit = mode === "helpdesk" ? 8 : mode === "references" ? 3 : isSearching ? 5 : 6;
  const visibleReferenceSuggestions = useMemo(
    () =>
      showAllSuggestions
        ? randomizedReferenceSuggestions
        : randomizedReferenceSuggestions.slice(0, referenceSuggestionLimit),
    [randomizedReferenceSuggestions, referenceSuggestionLimit, showAllSuggestions]
  );
  const visibleHelpdeskSuggestions = useMemo(
    () =>
      showAllSuggestions
        ? randomizedHelpdeskSuggestions
        : randomizedHelpdeskSuggestions.slice(0, helpdeskSuggestionLimit),
    [randomizedHelpdeskSuggestions, helpdeskSuggestionLimit, showAllSuggestions]
  );
  const quickStartHelpdesk = useMemo(
    () => randomizedHelpdeskSuggestions.slice(0, 2),
    [randomizedHelpdeskSuggestions]
  );
  const quickStartReferences = useMemo(
    () => randomizedReferenceSuggestions.slice(0, 2),
    [randomizedReferenceSuggestions]
  );
  const hasExactSuggestion = useMemo(
    () => suggestions.some((item) => normalizeForMatch(item.title) === normalizedQuery),
    [normalizedQuery, suggestions]
  );
  const hasMoreSuggestions =
    visibleReferenceSuggestions.length < randomizedReferenceSuggestions.length ||
    visibleHelpdeskSuggestions.length < randomizedHelpdeskSuggestions.length;

  const resetResultState = useCallback(() => {
    setResult(null);
    setError(null);
    setConversationId(null);
    setAssistantMessageId(null);
    setFeedbackDone(null);
  }, []);

  useEffect(() => {
    if (!open || shouldHideWidget) return;
    setSuggestionSeed(Date.now());
    setShowAllSuggestions(false);
  }, [open, shouldHideWidget]);

  useEffect(() => {
    if (!open || shouldHideWidget) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const params = new URLSearchParams({
          q: query.trim(),
          mode,
          limit: query.trim() ? (mode === "auto" ? "18" : "16") : mode === "auto" ? "24" : "18",
        });
        const response = await apiGet(`/api/ai/assistant/suggestions?${params.toString()}`, { signal: controller.signal });
        if (!response.ok) return;
        const payload = (await response.json().catch(() => null)) as AssistantSuggestionsResponse | null;
        setSuggestions(Array.isArray(payload?.items) ? payload.items : []);
        setHasLoadedSuggestions(true);
      } catch {
        // Bỏ qua lỗi tạm thời.
      } finally {
        setSuggestionsLoading(false);
      }
    }, query.trim() ? 180 : 0);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, query, mode, shouldHideWidget]);

  useEffect(() => {
    setShowAllSuggestions(false);
  }, [query, mode]);

  useEffect(() => {
    if (!isQueryEmpty) return;
    if (!result && !error && !conversationId && !assistantMessageId && feedbackDone === null) {
      return;
    }

    resetResultState();
  }, [isQueryEmpty, result, error, conversationId, assistantMessageId, feedbackDone, resetResultState]);

  function handleClearQuery() {
    setQuery("");
    resetResultState();
  }

  async function handleAsk(nextQuery?: string, nextMode?: AssistantMode) {
    const askText = (nextQuery ?? query).trim();
    const askMode = nextMode ?? mode;
    if (!askText) return;

    setLoading(true);
    setError(null);
    if (nextQuery) setQuery(askText);

    try {
      const response = await apiPost("/api/ai/assistant", {
        query: askText,
        mode: askMode,
        level: askMode !== "helpdesk" ? level : undefined,
        current_path: currentPath ?? pathname ?? "/",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(formatError(response.status, typeof payload?.error === "string" ? payload.error : null));
      }

      const nextResult = (payload?.data ?? null) as AssistantResponse | null;
      setResult(nextResult);
      setFeedbackDone(null);
      if (nextResult?.resolved_mode) {
        setConversationId(typeof payload?.meta?.conversation_id === "string" ? payload.meta.conversation_id : null);
        setAssistantMessageId(
          typeof payload?.meta?.assistant_message_id === "string" ? payload.meta.assistant_message_id : null
        );
      } else {
        setConversationId(null);
        setAssistantMessageId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi không xác định.");
    } finally {
      setLoading(false);
    }
  }

  function handleSuggestionPick(item: SuggestionItem) {
    setQuery(item.title);
    void handleAsk(item.search_query || item.title, item.kind);
  }

  async function submitFeedback(rating: 1 | -1) {
    if (!conversationId || !assistantMessageId || !result?.resolved_mode || feedbackLoading) return;
    setFeedbackLoading(true);
    try {
      const response = await apiPost("/api/ai/feedback", {
        conversation_id: conversationId,
        assistant_message_id: assistantMessageId,
        mode: result.resolved_mode,
        rating,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(formatError(response.status, typeof payload?.error === "string" ? payload.error : null));
      }
      setFeedbackDone(rating);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gửi phản hồi thất bại.");
    } finally {
      setFeedbackLoading(false);
    }
  }

  if (shouldHideWidget) return null;

  return (
    <>
      <div aria-hidden className="pointer-events-none h-24 sm:h-28 lg:h-24" />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            aria-label="AI assistant"
            title="AI assistant"
            className="fixed bottom-4 right-4 z-50 size-12 rounded-full bg-slate-950 p-0 text-[0px] text-white shadow-[0_20px_40px_-18px_rgba(15,23,42,0.72)] hover:bg-slate-900 sm:bottom-5 sm:right-5 sm:size-14"
          >
            <span className="absolute right-1.5 top-1.5 inline-flex size-2.5 rounded-full border border-slate-950 bg-emerald-400" />
            <Sparkles className="size-5 sm:size-[1.35rem]" />
            Trợ lý AI
          </Button>
        </DialogTrigger>

        <DialogContent className="overflow-hidden border-0 p-0 shadow-2xl sm:max-w-5xl">
          <DialogTitle className="sr-only">Trợ lý AI</DialogTitle>

        <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_34%),linear-gradient(135deg,#020617,#0f172a_55%,#164e63)] px-5 py-4 text-white">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
                <Sparkles className="size-3.5" />
                Trợ lý AI
              </p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight">Hỏi nhanh, mở đúng nội dung</h3>
            </div>
            <Badge className="rounded-full border border-white/10 bg-white/10 px-3 text-white hover:bg-white/10">
              {formatMode(mode)}
            </Badge>
          </div>
        </div>

        <div className="grid max-h-[80vh] overflow-hidden lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="overflow-y-auto border-b border-slate-200 bg-slate-50/80 p-4 lg:border-b-0 lg:border-r">
            <div className="flex flex-wrap gap-2">
              {MODE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant={mode === option.value ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => setMode(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>

            <div className="mt-3 relative">
              <Textarea
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  mode === "helpdesk"
                    ? "Ví dụ: Tôi không xem được bài học"
                    : mode === "references"
                      ? "Ví dụ: React Hooks cho người mới"
                      : "Ví dụ: Tài liệu Playwright hoặc lỗi đăng nhập"
                }
                rows={4}
                className="min-h-[132px] resize-none rounded-2xl border-slate-200 bg-white pr-20 shadow-sm"
              />
              {query.length > 0 ? (
                <button
                  type="button"
                  onClick={handleClearQuery}
                  className="absolute right-10 top-2.5 inline-flex size-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Xóa nhanh nội dung"
                  title="Xóa nhanh"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
              <Search className="absolute right-3 top-3 size-4 text-slate-400" />
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] lg:grid-cols-1 xl:grid-cols-[1fr_auto]">
              <select
                value={level}
                onChange={(event) => setLevel(event.target.value as ReferenceLevel)}
                disabled={!canUseLevel}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                {LEVEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Button
                onClick={() => void handleAsk()}
                disabled={loading || !query.trim()}
                className="h-10 rounded-xl bg-slate-950 px-5 text-white hover:bg-slate-900"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <MessageSquare className="size-4" />}
                {loading ? "Đang xử lý" : "Gửi"}
              </Button>
            </div>

            <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Gợi ý</p>
                {suggestionsLoading ? (
                  <span className="text-xs text-slate-500">Đang tải...</span>
                ) : null}
              </div>
              {visibleReferenceSuggestions.length > 0 ? (
                <div className="space-y-2">
                  <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-700">Tài liệu</p>
                  {visibleReferenceSuggestions.map((item) => {
                    const sourceType = inferSourceType(item.source_type, item.url);
                    const badge = SOURCE_BADGES[sourceType];
                    const isExact = normalizeForMatch(item.title) === normalizedQuery;
                    return (
                      <button
                        key={`${item.kind}-${item.title}-${item.url}`}
                        type="button"
                        onClick={() => handleSuggestionPick(item)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-left transition hover:border-cyan-300 hover:bg-cyan-50"
                      >
                        <div className="flex items-start gap-3">
                          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200">
                            <badge.Icon className="size-4 text-slate-700" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ring-1 ${badge.className}`}>
                                <badge.Icon className="size-3" />
                                {badge.label}
                              </span>
                              {isExact ? <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">Khớp</span> : null}
                            </span>
                            <span className="mt-2 block line-clamp-2 text-sm font-semibold text-slate-900">{item.title}</span>
                            <span className="mt-1 block line-clamp-1 text-xs text-slate-500">{suggestionMeta(item)}</span>
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {visibleHelpdeskSuggestions.length > 0 ? (
                <div className={visibleReferenceSuggestions.length > 0 ? "mt-3 border-t border-slate-100 pt-3" : ""}>
                  <div className="space-y-2">
                    <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Hỗ trợ</p>
                    {visibleHelpdeskSuggestions.map((item) => {
                      const isExact = normalizeForMatch(item.title) === normalizedQuery;
                      return (
                        <button
                          key={`${item.kind}-${item.title}`}
                          type="button"
                          onClick={() => handleSuggestionPick(item)}
                          className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                            isExact
                              ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                              : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                          }`}
                          title={item.title}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`inline-flex size-8 shrink-0 items-center justify-center rounded-2xl ring-1 ${
                                isExact ? "bg-white/10 text-white ring-white/10" : "bg-white text-slate-700 ring-slate-200"
                              }`}
                            >
                              <LifeBuoy className="size-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2">
                                <span
                                  className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${
                                    isExact ? "bg-white/10 text-slate-100" : "bg-slate-100 text-slate-500"
                                  }`}
                                >
                                  Hỗ trợ
                                </span>
                                {isExact ? (
                                  <span className="inline-flex rounded-full bg-emerald-400/15 px-2 py-1 text-[10px] font-semibold text-emerald-200">
                                    Khớp
                                  </span>
                                ) : null}
                              </span>
                              <span className={`mt-2 block line-clamp-2 text-sm font-semibold leading-5 ${isExact ? "text-white" : "text-slate-900"}`}>
                                {item.title}
                              </span>
                              <span className={`mt-1 block line-clamp-1 text-xs ${isExact ? "text-slate-300" : "text-slate-500"}`}>
                                {item.description || "Câu hỏi hỗ trợ trong hệ thống"}
                              </span>
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {hasLoadedSuggestions && !suggestionsLoading && suggestions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
                  Không có gợi ý phù hợp
                </div>
              ) : null}

              {query.trim() && !hasExactSuggestion && suggestions.length > 0 ? (
                <p className="mt-3 text-xs text-amber-700">Chọn gợi ý gần nhất để AI bám sát dữ liệu.</p>
              ) : null}
              {hasLoadedSuggestions && !suggestionsLoading && hasMoreSuggestions ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 h-9 w-full rounded-2xl"
                  onClick={() => setShowAllSuggestions(true)}
                >
                  Xem thêm gợi ý
                </Button>
              ) : null}

              {hasLoadedSuggestions && !suggestionsLoading && showAllSuggestions && !hasMoreSuggestions && suggestions.length > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-8 w-full rounded-2xl text-slate-500 hover:text-slate-700"
                  onClick={() => setShowAllSuggestions(false)}
                >
                  Thu gọn
                </Button>
              ) : null}
            </div>
          </aside>

          <section className="overflow-y-auto bg-white p-4 sm:p-5">
            {loading ? (
              <AssistantLoadingState />
            ) : error ? (
              <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                <p className="flex items-center gap-2 font-medium">
                  <CircleAlert className="size-4" />
                  {error}
                </p>
              </div>
            ) : result ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="rounded-full bg-slate-950 px-3 text-white hover:bg-slate-950">{formatResolvedMode(result.resolved_mode)}</Badge>
                    <Badge variant="outline" className="rounded-full">{formatMode(result.requested_mode)}</Badge>
                  </div>

                  {conversationId && assistantMessageId && result.resolved_mode ? (
                    <div className="flex items-center gap-2">
                      <Button type="button" size="sm" variant={feedbackDone === 1 ? "default" : "outline"} onClick={() => void submitFeedback(1)} disabled={feedbackLoading} className="rounded-full">
                        <ThumbsUp className="size-4" />
                        Hữu ích
                      </Button>
                      <Button type="button" size="sm" variant={feedbackDone === -1 ? "destructive" : "outline"} onClick={() => void submitFeedback(-1)} disabled={feedbackLoading} className="rounded-full">
                        <ThumbsDown className="size-4" />
                        Chưa ổn
                      </Button>
                    </div>
                  ) : null}
                </div>

                {result.kind === "clarify" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {result.data.options.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => void handleAsk(undefined, option.value)}
                        className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-5 text-left transition hover:border-cyan-300 hover:bg-cyan-50"
                      >
                        <p className="text-sm font-semibold text-slate-900">{option.label}</p>
                        <p className="mt-1 text-xs text-slate-500">{result.data.question}</p>
                      </button>
                    ))}
                  </div>
                ) : null}

                {result.kind === "helpdesk" ? (
                  <div className="space-y-3">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <h4 className="text-lg font-semibold text-slate-900">{result.data.answer_title}</h4>
                    </div>

                    <div className="space-y-3">
                      {result.data.steps.map((step, index) => (
                        <div key={`${step.title}-${index}`} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="flex items-start gap-3">
                            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">{index + 1}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                              <p className="mt-1 text-sm leading-6 text-slate-600">{step.detail}</p>
                              {step.deep_link ? (
                                <a href={step.deep_link} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-cyan-700 hover:underline">
                                  Mở trang
                                  <ArrowUpRight className="size-3.5" />
                                </a>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {result.data.common_issues.length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {result.data.common_issues.map((issue, index) => (
                          <div key={`${issue.symptom}-${index}`} className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
                            <p className="text-sm font-semibold text-slate-900">{issue.symptom}</p>
                            <p className="mt-2 text-xs leading-5 text-slate-600">Nguyên nhân: {issue.cause}</p>
                            <p className="mt-1 text-xs leading-5 text-slate-600">Cách xử lý: {issue.fix}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {(result.data.suggested_questions ?? []).length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {(result.data.suggested_questions ?? []).map((item) => (
                          <Button key={item.question} type="button" size="sm" variant="outline" className="rounded-full" onClick={() => void handleAsk(item.question, "helpdesk")}>
                            {item.question}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {result.kind === "references" ? (
                  <div className="space-y-3">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <h4 className="text-lg font-semibold text-slate-900">{result.data.topic}</h4>
                    </div>

                    {result.data.recommendations.length > 0 ? (
                      <div className="grid gap-3 xl:grid-cols-2">
                        {result.data.recommendations.map((item, index) => {
                          const sourceType = inferSourceType(item.source_type, item.url);
                          const badge = SOURCE_BADGES[sourceType];
                          return (
                            <div key={`${item.title}-${index}`} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ring-1 ${badge.className}`}>
                                  <badge.Icon className="size-3" />
                                  {badge.label}
                                </span>
                                <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">{formatLevel(item.level)}</span>
                              </div>
                              <p className="mt-3 text-sm font-semibold text-slate-900">{item.title}</p>
                              <p className="mt-2 text-sm leading-6 text-slate-600">{item.reason}</p>
                              {item.url ? (
                                <a href={item.url} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-cyan-700 hover:underline">
                                  Mở tài liệu
                                  <ArrowUpRight className="size-3.5" />
                                </a>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Không tìm thấy tài liệu phù hợp.</div>
                    )}

                    {result.data.notes.length > 0 ? (
                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                        <div className="space-y-1.5">
                          {result.data.notes.map((note, index) => (
                            <p key={`note-${index}`} className="text-sm text-slate-600">- {note}</p>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex min-h-[420px] flex-col rounded-[28px] border border-dashed border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.12),_transparent_35%),#f8fafc] p-5">
                <div>
                  <Badge variant="outline" className="rounded-full border-cyan-200 bg-white text-cyan-700">Sẵn sàng</Badge>
                  <h4 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">Bắt đầu bằng một câu hỏi ngắn</h4>
                  <p className="mt-2 text-sm text-slate-500">Chọn một gợi ý hoặc nhập câu hỏi của bạn.</p>
                </div>

                <div className="mt-8 space-y-5">
                  <div>
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Thử nhanh</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(quickStartHelpdesk.length > 0 ? quickStartHelpdesk : [
                        {
                          kind: "helpdesk" as const,
                          title: "Không vào được bài học",
                          search_query: "Tôi không vào được bài học sau khi đăng nhập",
                          url: "",
                          description: "",
                          source_type: null,
                          course_title: "",
                          course_url: "",
                          category: "",
                          level: "",
                        },
                      ]).map((item) => (
                        <button
                          key={`quick-helpdesk-${item.title}`}
                          type="button"
                          onClick={() => void handleAsk(item.search_query || item.title, "helpdesk")}
                          className="rounded-3xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                          <p className="mt-1 text-xs text-slate-500">Hỗ trợ</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Tài liệu gợi ý</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(quickStartReferences.length > 0 ? quickStartReferences : [
                        {
                          kind: "references" as const,
                          title: "Tài liệu Playwright",
                          search_query: "Tài liệu Playwright cho người mới",
                          url: "",
                          description: "",
                          source_type: "references" as const,
                          course_title: "",
                          course_url: "",
                          category: "",
                          level: "",
                        },
                      ]).map((item) => (
                        <button
                          key={`quick-reference-${item.title}`}
                          type="button"
                          onClick={() => void handleAsk(item.search_query || item.title, "references")}
                          className="rounded-3xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-cyan-300 hover:bg-cyan-50"
                        >
                          <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.course_title || "Tài liệu"}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
