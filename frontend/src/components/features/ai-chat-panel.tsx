"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef } from "react";
import {
  ArrowUpRight,
  BookOpen,
  FileText,
  Layers3,
  Loader2,
  Send,
  ShieldAlert,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  UserRound,
} from "lucide-react";

import { AiSurfaceState } from "@/components/features/ai-surface-state";
import {
  QUIZ_RESTRICTED_POLICY_ANSWER,
  QUIZ_RESTRICTED_STARTER_PROMPTS,
  useAiUi,
} from "@/components/providers/ai-ui-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ChatReference } from "@/lib/ai-schemas";
import { trackAiEvent } from "@/lib/ai-tracking";
import { cn } from "@/lib/utils";

function referenceIcon(kind: ChatReference["kind"]) {
  if (kind === "module") return Layers3;
  if (kind === "lesson") return FileText;
  return BookOpen;
}

function referenceLabel(kind: ChatReference["kind"]) {
  if (kind === "module") return "Mô-đun";
  if (kind === "lesson") return "Bài học";
  return "Khóa học";
}

function feedbackText(value: 1 | -1 | null | undefined): string | null {
  if (value === 1) return "Đã ghi nhận phản hồi hữu ích.";
  if (value === -1) return "Đã ghi nhận phản hồi chưa ổn.";
  return null;
}

function renderInlineText(text: string, keyPrefix: string) {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((segment, index) => {
      const boldMatch = /^\*\*([\s\S]+)\*\*$/.exec(segment);
      if (boldMatch) {
        return (
          <strong key={`${keyPrefix}-${index}`} className="font-semibold text-slate-950">
            {boldMatch[1]}
          </strong>
        );
      }

      return <Fragment key={`${keyPrefix}-${index}`}>{segment}</Fragment>;
    });
}

function renderAssistantContent(text: string) {
  const blocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks.map((block, blockIndex) => {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length > 0 && lines.every((line) => /^[-*]\s+/.test(line))) {
      return (
        <ul
          key={`block-${blockIndex}`}
          className="space-y-2 pl-5 text-[15px] leading-7 text-slate-700 [overflow-wrap:anywhere]"
        >
          {lines.map((line, lineIndex) => (
            <li key={`block-${blockIndex}-line-${lineIndex}`}>
              {renderInlineText(line.replace(/^[-*]\s+/, ""), `bullet-${blockIndex}-${lineIndex}`)}
            </li>
          ))}
        </ul>
      );
    }

    if (lines.length > 0 && lines.every((line) => /^\d+\.\s+/.test(line))) {
      return (
        <ol
          key={`block-${blockIndex}`}
          className="space-y-2 pl-5 text-[15px] leading-7 text-slate-700 [overflow-wrap:anywhere]"
        >
          {lines.map((line, lineIndex) => (
            <li key={`ordered-${blockIndex}-${lineIndex}`}>
              {renderInlineText(
                line.replace(/^\d+\.\s+/, ""),
                `ordered-${blockIndex}-${lineIndex}`
              )}
            </li>
          ))}
        </ol>
      );
    }

    return (
      <p
        key={`block-${blockIndex}`}
        className="m-0 whitespace-pre-wrap text-[15px] leading-7 text-slate-700 [overflow-wrap:anywhere]"
      >
        {lines.map((line, lineIndex) => (
          <Fragment key={`paragraph-${blockIndex}-${lineIndex}`}>
            {lineIndex > 0 ? <br /> : null}
            {renderInlineText(line, `paragraph-${blockIndex}-${lineIndex}`)}
          </Fragment>
        ))}
      </p>
    );
  });
}

export function AiChatPanel({
  className,
  emptyTitle,
  emptyDescription,
  inputPlaceholder,
  compact = false,
}: {
  className?: string;
  emptyTitle: string;
  emptyDescription: string;
  inputPlaceholder: string;
  compact?: boolean;
}) {
  const {
    composerDraft,
    setComposerDraft,
    messages,
    loading,
    error,
    lastFailedMessage,
    feedbackByMessageId,
    feedbackLoadingByMessageId,
    pageContext,
    sendMessage,
    sendFeedback,
  } = useAiUi();
  const threadRef = useRef<HTMLDivElement | null>(null);
  const restrictedMode = pageContext.surface === "quiz_restricted";

  useEffect(() => {
    const node = threadRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [messages]);

  return (
    <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col", className)}>
      <div
        ref={threadRef}
        className={cn(
          "flex-1 overflow-x-hidden overflow-y-auto px-4 py-5 sm:px-6",
          compact ? "bg-transparent" : "[background:var(--ai-panel-bg-grounded)]"
        )}
      >
        {messages.length === 0 ? (
          <AiSurfaceState
            state="empty"
            title={emptyTitle}
            description={emptyDescription}
            className="flex min-h-full flex-col items-center justify-center px-6 py-10 text-center"
          />
        ) : (
          <div className="space-y-5">
            {messages.map((item) => {
              if (item.role === "user") {
                return (
                  <div key={item.id} className="flex justify-end">
                    <div className="flex max-w-[min(100%,52rem)] items-end gap-3">
                      <div className="min-w-0 rounded-[28px] bg-[var(--ai-action-primary-bg)] px-5 py-4 text-[15px] leading-7 text-white shadow-[0_18px_54px_-30px_rgba(15,23,42,0.8)] [overflow-wrap:anywhere]">
                        <p className="m-0 whitespace-pre-wrap">{item.text}</p>
                      </div>
                      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                        <UserRound className="size-5" />
                      </span>
                    </div>
                  </div>
                );
              }

              const feedbackState = item.assistantMessageId
                ? feedbackByMessageId[item.assistantMessageId]
                : null;
              const feedbackLoading = item.assistantMessageId
                ? Boolean(feedbackLoadingByMessageId[item.assistantMessageId])
                : false;
              const isPolicyMessage =
                item.policy || (restrictedMode && item.text === QUIZ_RESTRICTED_POLICY_ANSWER);

              return (
                <div key={item.id} className="flex justify-start">
                  <div className="flex w-full max-w-[min(100%,68rem)] items-start gap-3">
                    <span
                      className={cn(
                        "inline-flex size-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm",
                        isPolicyMessage
                          ? "bg-[var(--ai-tone-restricted-text)]"
                          : "bg-[var(--ai-badge-grounded-bg)]"
                      )}
                    >
                      {isPolicyMessage ? <ShieldAlert className="size-5" /> : <Sparkles className="size-5" />}
                    </span>

                    <div
                      className={cn(
                        "ai-insight-card min-w-0 flex-1 rounded-[28px] p-5",
                        isPolicyMessage ? "ai-insight-card--restricted" : "ai-insight-card--neutral"
                      )}
                    >
                      {item.pending ? (
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Loader2 className="size-4 animate-spin" />
                          Đang xử lý câu hỏi của bạn...
                        </div>
                      ) : (
                        <>
                          <div className="mb-4 flex flex-wrap items-center gap-2">
                            <Badge
                              className={cn(
                                "ai-badge px-3 py-1",
                                isPolicyMessage ? "ai-badge--restricted" : "ai-badge--advisory"
                              )}
                            >
                              {isPolicyMessage ? "Chính sách bài kiểm tra" : "AI"}
                            </Badge>
                            {isPolicyMessage ? (
                              <Badge className="ai-badge ai-badge--soft ai-badge--restricted">
                                Chế độ quiz giới hạn
                              </Badge>
                            ) : null}
                            {!isPolicyMessage && item.references.length > 0 ? (
                              <Badge className="ai-badge ai-badge--soft ai-badge--neutral">
                                {item.references.length} liên kết tham chiếu
                              </Badge>
                            ) : null}
                          </div>

                          <div className="space-y-4 overflow-x-hidden [overflow-wrap:anywhere]">
                            {renderAssistantContent(item.text)}
                          </div>

                          {!isPolicyMessage && item.references.length > 0 ? (
                            <div className="mt-5 grid gap-3 xl:grid-cols-2">
                              {item.references.map((reference) => {
                                const Icon = referenceIcon(reference.kind);
                                return (
                                  <Link
                                    key={`${reference.kind}-${reference.id}`}
                                    href={reference.url}
                                    className="ai-insight-card ai-insight-card--neutral min-w-0 rounded-[24px] p-4 transition hover:-translate-y-0.5 hover:shadow-md"
                                  >
                                    <div className="flex items-start gap-3">
                                      <span className="ai-insight-card__icon inline-flex size-11 shrink-0 items-center justify-center rounded-2xl">
                                        <Icon className="size-4" />
                                      </span>

                                      <span className="min-w-0 flex-1">
                                        <span className="ai-badge ai-badge--soft ai-badge--neutral">
                                          {referenceLabel(reference.kind)}
                                        </span>
                                        <span className="mt-2 block text-sm font-semibold leading-6 text-slate-900 [overflow-wrap:anywhere]">
                                          {reference.title}
                                        </span>
                                        {reference.subtitle ? (
                                          <span className="mt-1 block text-xs leading-5 text-slate-500 [overflow-wrap:anywhere]">
                                            {reference.subtitle}
                                          </span>
                                        ) : null}
                                        {reference.description ? (
                                          <span className="mt-2 block text-xs leading-5 text-slate-600 [overflow-wrap:anywhere]">
                                            {reference.description}
                                          </span>
                                        ) : null}
                                        <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-cyan-700">
                                          Mở nội dung
                                          <ArrowUpRight className="size-3.5" />
                                        </span>
                                      </span>
                                    </div>
                                  </Link>
                                );
                              })}
                            </div>
                          ) : null}

                          {item.suggestedQuestions.length > 0 ? (
                            <div className="mt-5 flex flex-wrap gap-2.5">
                              {item.suggestedQuestions.map((question) => (
                                <Button
                                  key={question}
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className={cn(
                                    "h-auto max-w-full rounded-full px-4 py-2 text-left whitespace-normal [overflow-wrap:anywhere]",
                                    isPolicyMessage
                                      ? "border-[var(--ai-tone-restricted-border)] bg-white text-[var(--ai-tone-restricted-text)] hover:bg-[var(--ai-tone-restricted-bg)]"
                                      : "border-[var(--ai-border-muted)] bg-white hover:bg-slate-50"
                                  )}
                                  onClick={() => {
                                    if (restrictedMode) {
                                      trackAiEvent("restricted_allowed_prompt_click", {
                                        surface: pageContext.surface,
                                        current_path: pageContext.currentPath,
                                      });
                                    }
                                    void sendMessage(question);
                                  }}
                                >
                                  {question}
                                </Button>
                              ))}
                            </div>
                          ) : null}

                          {!isPolicyMessage && item.assistantMessageId ? (
                            <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-slate-100 pt-4">
                              <Button
                                type="button"
                                size="sm"
                                variant={feedbackState === 1 ? "default" : "outline"}
                                className="rounded-full"
                                disabled={feedbackLoading}
                                onClick={() => void sendFeedback(item.assistantMessageId!, 1)}
                              >
                                <ThumbsUp className="size-4" />
                                Hữu ích
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant={feedbackState === -1 ? "destructive" : "outline"}
                                className="rounded-full"
                                disabled={feedbackLoading}
                                onClick={() => void sendFeedback(item.assistantMessageId!, -1)}
                              >
                                <ThumbsDown className="size-4" />
                                Chưa ổn
                              </Button>
                              {feedbackText(feedbackState) ? (
                                <span className="text-xs leading-5 text-slate-500">
                                  {feedbackText(feedbackState)}
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-slate-200/80 bg-white/95 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur sm:px-6 sm:pb-6">
        {error ? (
          <AiSurfaceState
            state="error"
            title="Không thể gửi tin nhắn"
            description={error}
            actionLabel={lastFailedMessage ? "Thử lại" : undefined}
            onAction={lastFailedMessage ? () => void sendMessage(lastFailedMessage) : undefined}
            className="mb-3"
          />
        ) : null}

        {restrictedMode ? (
          <AiSurfaceState
            state="restricted"
            title="AI đang ở chế độ giảm hỗ trợ"
            description="AI sẽ không cung cấp đáp án trực tiếp trong lúc bạn đang làm quiz. Bạn có thể hỏi về cách nộp bài, thời gian, lượt làm hoặc nơi xem lại sau khi nộp."
            className="mb-3"
          />
        ) : null}

        <div className="ai-insight-card ai-insight-card--neutral rounded-[28px] p-3">
          <Textarea
            value={composerDraft}
            onChange={(event) => setComposerDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
            placeholder={inputPlaceholder}
            rows={compact ? 2 : 3}
            className="min-h-[92px] resize-none border-0 bg-transparent px-1 py-1 text-[15px] leading-7 shadow-none focus-visible:ring-0"
          />
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 flex-1 text-xs leading-5 text-slate-500">
              {restrictedMode
                ? `Shift + Enter để xuống dòng. Gợi ý an toàn: ${QUIZ_RESTRICTED_STARTER_PROMPTS.join(" • ")}`
                : "Shift + Enter để xuống dòng. AI sẽ ưu tiên dữ liệu hiện có trong hệ thống."}
            </p>
            <Button
              type="button"
              onClick={() => void sendMessage()}
              disabled={loading || !composerDraft.trim()}
              className={cn(
                "ai-action-primary w-full rounded-full px-5 sm:w-auto",
                loading && "pointer-events-none"
              )}
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Gửi
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
