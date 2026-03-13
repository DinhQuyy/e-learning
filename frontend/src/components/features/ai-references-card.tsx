"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BookMarked,
  BookOpen,
  ExternalLink,
  FileText,
  Layers3,
  Loader2,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";

import { apiGet, apiPost } from "@/lib/api-fetch";
import type { ReferencesResponse, ReferencesSuggestionsResponse } from "@/lib/ai-schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ReferenceLevel = "basic" | "intermediate" | "advanced";
type ReferenceSourceType = ReferencesSuggestionsResponse["items"][number]["source_type"];

const LEVEL_OPTIONS: Array<{ value: ReferenceLevel; label: string }> = [
  { value: "basic", label: "Co ban" },
  { value: "intermediate", label: "Trung cap" },
  { value: "advanced", label: "Nang cao" },
];

const SUGGESTION_BADGES: Record<
  ReferencesSuggestionsResponse["items"][number]["source_type"],
  { label: string; className: string; Icon: typeof BookOpen }
> = {
  references: {
    label: "Course",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Icon: BookOpen,
  },
  course_module: {
    label: "Module",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
    Icon: Layers3,
  },
  course_lesson: {
    label: "Lesson",
    className: "bg-cyan-50 text-cyan-700 ring-cyan-200",
    Icon: FileText,
  },
  quiz: {
    label: "Quiz",
    className: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200",
    Icon: FileText,
  },
};

const SUGGESTION_OPEN_LABELS: Record<
  ReferenceSourceType,
  string
> = {
  references: "Mo course",
  course_module: "Mo module",
  course_lesson: "Mo lesson",
  quiz: "Mo quiz",
};

function readErrorMessage(status: number, payload: unknown): string {
  if (status === 401) return "Bạn cần đăng nhập để sử dụng Trợ lý AI.";
  if (status === 403) return "Ban khong co quyen truy cap du lieu tham khao nay.";
  if (payload && typeof payload === "object" && "error" in payload) {
    const message = (payload as { error?: unknown }).error;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  return "Khong the lay goi y tham khao luc nay.";
}

function normalizeUrl(url: string): { href: string; external: boolean } {
  const safe = url.trim();
  if (!safe) return { href: "", external: false };
  if (/^https?:\/\//i.test(safe)) return { href: safe, external: true };
  if (safe.startsWith("/")) return { href: safe, external: false };
  return { href: `https://${safe}`, external: true };
}

function formatSuggestionLevel(level: string): string {
  const normalized = level.trim().toLowerCase();
  if (normalized === "beginner") return "Nguoi moi";
  if (normalized === "intermediate") return "Trung cap";
  if (normalized === "advanced") return "Nang cao";
  return "";
}

function buildSuggestionMeta(item: ReferencesSuggestionsResponse["items"][number]): string {
  const parts: string[] = [];

  if (item.source_type !== "references" && item.course_title.trim()) {
    parts.push(item.course_title.trim());
  }

  if (item.category.trim()) {
    parts.push(item.category.trim());
  }

  const levelLabel = formatSuggestionLevel(item.level);
  if (levelLabel) {
    parts.push(levelLabel);
  }

  return parts.join(" - ");
}

function inferRecommendationSourceType(
  item: ReferencesResponse["recommendations"][number]
): ReferenceSourceType {
  if (item.source_type && item.source_type in SUGGESTION_BADGES) {
    return item.source_type as ReferenceSourceType;
  }

  const safeUrl = item.url.trim().toLowerCase();
  if (safeUrl.includes("/learn/")) return "course_lesson";
  if (safeUrl.includes("module=") || safeUrl.includes("#module-")) return "course_module";
  if (safeUrl.includes("quiz")) return "quiz";
  return "references";
}

export function AiReferencesCard({ courseId }: { courseId: string | null }) {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<ReferenceLevel>("basic");
  const [loading, setLoading] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<ReferencesSuggestionsResponse["items"]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReferencesResponse | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [assistantMessageId, setAssistantMessageId] = useState<string | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState<1 | -1 | null>(null);

  const canSubmit = useMemo(() => query.trim().length > 0 && !loading, [query, loading]);

  useEffect(() => {
    if (!suggestionsOpen) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const params = new URLSearchParams({
          q: query.trim(),
          limit: "10",
        });
        const response = await apiGet(`/api/ai/references/suggestions?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => null)) as ReferencesSuggestionsResponse | null;
        if (!response.ok) {
          throw new Error(readErrorMessage(response.status, payload));
        }
        setSuggestions(Array.isArray(payload?.items) ? payload.items : []);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setSuggestions([]);
        }
      } finally {
        setSuggestionsLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, suggestionsOpen]);

  async function handleSearch(nextQuery?: string) {
    const trimmed = (nextQuery ?? query).trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setSuggestionsOpen(false);
    try {
      const response = await apiPost("/api/ai/references", {
        query: trimmed,
        course_id: courseId ?? undefined,
        level,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(readErrorMessage(response.status, payload));
      }

      setResult((payload?.data ?? null) as ReferencesResponse | null);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Loi khong xac dinh");
    } finally {
      setLoading(false);
    }
  }

  function handleSuggestionPick(item: ReferencesSuggestionsResponse["items"][number]) {
    const nextQuery = item.search_query.trim() || item.title;
    setQuery(item.title);
    setSuggestionsOpen(false);
    void handleSearch(nextQuery);
  }

  async function submitFeedback(rating: 1 | -1) {
    if (!conversationId || !assistantMessageId || feedbackLoading) return;
    setFeedbackLoading(true);
    try {
      const response = await apiPost("/api/ai/feedback", {
        conversation_id: conversationId,
        assistant_message_id: assistantMessageId,
        mode: "references",
        rating,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(readErrorMessage(response.status, payload));
      }

      setFeedbackDone(rating);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gui feedback that bai");
    } finally {
      setFeedbackLoading(false);
    }
  }

  return (
    <Card className="border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-slate-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookMarked className="size-4 text-cyan-700" />
          Trợ lý AI - Tài liệu
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
          <div className="relative space-y-2">
            <Label htmlFor="ref-query">Chu de can tham khao</Label>
            <Input
              id="ref-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setSuggestionsOpen(true)}
              onBlur={() => window.setTimeout(() => setSuggestionsOpen(false), 120)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleSearch();
                }
                if (event.key === "Escape") {
                  setSuggestionsOpen(false);
                }
              }}
              placeholder="Vi du: Lo trinh hoc React cho nguoi moi"
            />
            {suggestionsOpen ? (
              <div className="absolute z-20 mt-1 w-full rounded-xl border border-cyan-100 bg-white shadow-lg">
                <div className="border-b border-slate-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Chu de co san trong du an
                </div>
                <div className="max-h-72 overflow-y-auto p-2">
                  {suggestionsLoading ? (
                    <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Dang tai goi y...
                    </div>
                  ) : suggestions.length > 0 ? (
                    suggestions.map((item) => {
                      const badge = SUGGESTION_BADGES[item.source_type];
                      const directLink = normalizeUrl(item.url);
                      const meta = buildSuggestionMeta(item);

                      return (
                        <div
                          key={`${item.source_type}-${item.course_title}-${item.title}-${item.url}`}
                          className="flex items-stretch gap-2 rounded-xl border border-transparent px-2 py-2 transition hover:border-cyan-200 hover:bg-cyan-50/70"
                        >
                          <button
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => handleSuggestionPick(item)}
                            className="flex min-w-0 flex-1 items-start gap-3 rounded-lg px-1 text-left"
                          >
                            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                              <badge.Icon className="size-4 text-slate-700" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ring-1 ${badge.className}`}
                                >
                                  <badge.Icon className="size-3" />
                                  {badge.label}
                                </span>
                                {item.level.trim() ? (
                                  <span className="inline-flex shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
                                    {formatSuggestionLevel(item.level) || item.level}
                                  </span>
                                ) : null}
                              </span>
                              <span className="mt-2 block truncate text-sm font-semibold text-slate-900">
                                {item.title}
                              </span>
                              {meta ? (
                                <span className="mt-1 block line-clamp-2 text-xs text-slate-500">
                                  {meta}
                                </span>
                              ) : (
                                <span className="mt-1 block text-xs text-slate-400">
                                  Tìm trong Trợ lý AI
                                </span>
                              )}
                            </span>
                          </button>

                          {directLink.href ? (
                            directLink.external ? (
                              <a
                                href={directLink.href}
                                target="_blank"
                                rel="noreferrer"
                                onMouseDown={(event) => event.preventDefault()}
                                className="inline-flex shrink-0 items-center gap-1 self-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm hover:border-cyan-300 hover:text-cyan-700"
                              >
                                {SUGGESTION_OPEN_LABELS[item.source_type]}
                                <ArrowUpRight className="size-3" />
                              </a>
                            ) : (
                              <Link
                                href={directLink.href}
                                onMouseDown={(event) => event.preventDefault()}
                                className="inline-flex shrink-0 items-center gap-1 self-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm hover:border-cyan-300 hover:text-cyan-700"
                              >
                                {SUGGESTION_OPEN_LABELS[item.source_type]}
                                <ArrowUpRight className="size-3" />
                              </Link>
                            )
                          ) : null}
                        </div>
                      );
                    })
                  ) : (
                    <p className="px-2 py-3 text-sm text-muted-foreground">
                      Chua tim thay chu de phu hop trong du lieu da dong bo.
                    </p>
                  )}
                </div>
              </div>
            ) : null}
            <p className="text-xs text-slate-500">
              Chon tu goi y de tim dung cac chu de da co trong du an.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ref-level">Do kho</Label>
            <select
              id="ref-level"
              value={level}
              onChange={(event) => setLevel(event.target.value as ReferenceLevel)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {LEVEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <Button type="button" onClick={() => void handleSearch()} disabled={!canSubmit}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Dang tim...
                </>
              ) : (
                "Goi y tai lieu"
              )}
            </Button>
          </div>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {result ? (
          <div className="space-y-3">
            {result.recommendations.length > 0 ? (
              result.recommendations.map((item, index) => {
                const normalized = normalizeUrl(item.url);
                const sourceType = inferRecommendationSourceType(item);
                const sourceBadge = SUGGESTION_BADGES[sourceType];
                return (
                  <div key={`${item.title}-${index}`} className="rounded-lg border bg-white p-3">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ring-1 ${sourceBadge.className}`}
                      >
                        <sourceBadge.Icon className="size-3" />
                        {sourceBadge.label}
                      </span>
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
                        {formatSuggestionLevel(item.level) || item.level}
                      </span>
                      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                        {item.type}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{item.reason}</p>

                    {normalized.href ? (
                      normalized.external ? (
                        <a
                          href={normalized.href}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-cyan-700 hover:underline"
                        >
                          Mo tai lieu
                          <ExternalLink className="size-3.5" />
                        </a>
                      ) : (
                        <Link
                          href={normalized.href}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-cyan-700 hover:underline"
                        >
                          Mo tai lieu
                          <ExternalLink className="size-3.5" />
                        </Link>
                      )
                    ) : null}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">
                Chua co tai lieu phu hop cho yeu cau nay.
              </p>
            )}

            {result.notes.length > 0 ? (
              <div className="rounded-lg border bg-white p-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Ghi chu</p>
                {result.notes.map((note, index) => (
                  <p key={`note-${index}`} className="text-sm text-slate-700">
                    - {note}
                  </p>
                ))}
              </div>
            ) : null}

            {conversationId && assistantMessageId ? (
              <div className="rounded-lg border bg-white p-3">
                <p className="mb-2 text-xs text-muted-foreground">
                  Danh gia de AI cai thien chat luong goi y tai lieu.
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={feedbackDone === 1 ? "default" : "outline"}
                    onClick={() => void submitFeedback(1)}
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
                    onClick={() => void submitFeedback(-1)}
                    disabled={feedbackLoading}
                    className="gap-1"
                  >
                    <ThumbsDown className="size-4" />
                    Chua huu ich
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nhap hoac chon mot chu de co san de nhan goi y tai lieu dung voi du lieu cua du an.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
