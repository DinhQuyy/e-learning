"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  FileText,
  GraduationCap,
  Layers3,
  Loader2,
  MessageSquare,
  RotateCcw,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { apiPost } from "@/lib/api-fetch";
import { cn } from "@/lib/utils";
import type { ChatReference, ChatResponse } from "@/lib/ai-schemas";

type ThreadMessage =
  | {
      id: string;
      role: "user";
      text: string;
    }
  | {
      id: string;
      role: "assistant";
      text: string;
      references: ChatReference[];
      suggestedQuestions: string[];
      assistantMessageId: string | null;
      pending?: boolean;
    };

const STARTER_PROMPTS = [
  "Khóa React nào phù hợp cho người mới bắt đầu?",
  "Tóm tắt nội dung chính của khóa Python cơ bản.",
  "Khóa nào phù hợp nếu tôi muốn học Next.js?",
  "Cho tôi xem khóa học có syllabus rõ ràng về UI/UX.",
];

const HIDDEN_PATH_PREFIXES = ["/login", "/register", "/forgot-password", "/reset-password"];

function referenceIcon(kind: ChatReference["kind"]) {
  if (kind === "module") return Layers3;
  if (kind === "lesson") return FileText;
  return BookOpen;
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

export function AiChatWidget({ currentPath }: { currentPath?: string } = {}) {
  const pathname = usePathname();
  const resolvedPath = currentPath ?? pathname ?? "/";
  const shouldHide = HIDDEN_PATH_PREFIXES.some((prefix) => resolvedPath.startsWith(prefix));

  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [feedbackByMessageId, setFeedbackByMessageId] = useState<Record<string, 1 | -1 | null>>({});
  const [feedbackLoadingByMessageId, setFeedbackLoadingByMessageId] = useState<Record<string, boolean>>({});
  const threadRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const node = threadRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  function resetConversation() {
    setConversationId(null);
    setMessages([]);
    setMessage("");
    setError(null);
    setLastFailedMessage(null);
    setFeedbackByMessageId({});
    setFeedbackLoadingByMessageId({});
  }

  async function sendMessage(rawMessage?: string) {
    const nextMessage = (rawMessage ?? message).trim();
    if (!nextMessage || loading) return;

    const userMessageId = `user-${Date.now()}`;
    const pendingMessageId = `assistant-pending-${Date.now()}`;

    setLoading(true);
    setError(null);
    setLastFailedMessage(null);
    setMessage("");
    setMessages((prev) => [
      ...prev,
      { id: userMessageId, role: "user", text: nextMessage },
      {
        id: pendingMessageId,
        role: "assistant",
        text: "",
        references: [],
        suggestedQuestions: [],
        assistantMessageId: null,
        pending: true,
      },
    ]);

    try {
      const res = await apiPost("/api/ai/chat", {
        message: nextMessage,
        conversation_id: conversationId,
        current_path: resolvedPath,
      });
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          typeof payload?.error === "string" ? payload.error : "Không thể gọi Trợ lý AI."
        );
      }

      const data = (payload?.data ?? null) as ChatResponse | null;
      const nextConversationId =
        typeof payload?.meta?.conversation_id === "string"
          ? payload.meta.conversation_id
          : null;
      const assistantMessageId =
        typeof payload?.meta?.assistant_message_id === "string"
          ? payload.meta.assistant_message_id
          : null;

      if (!data) {
        throw new Error("Phản hồi từ Trợ lý AI không hợp lệ.");
      }

      setConversationId(nextConversationId);
      setMessages((prev) =>
        prev.map((item) =>
          item.id === pendingMessageId
            ? {
                id: assistantMessageId ?? pendingMessageId,
                role: "assistant",
                text: data.answer,
                references: data.references,
                suggestedQuestions: data.suggested_questions,
                assistantMessageId,
              }
            : item
        )
      );
    } catch (err) {
      const messageText =
        err instanceof Error ? err.message : "Không thể gọi Trợ lý AI.";
      setError(messageText);
      setLastFailedMessage(nextMessage);
      setMessages((prev) => prev.filter((item) => item.id !== pendingMessageId));
    } finally {
      setLoading(false);
    }
  }

  async function sendFeedback(assistantMessageId: string, rating: 1 | -1) {
    if (!conversationId || feedbackLoadingByMessageId[assistantMessageId]) return;

    setFeedbackLoadingByMessageId((prev) => ({ ...prev, [assistantMessageId]: true }));
    try {
      const res = await apiPost("/api/ai/feedback", {
        conversation_id: conversationId,
        assistant_message_id: assistantMessageId,
        mode: "chat",
        rating,
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          typeof payload?.error === "string" ? payload.error : "Gửi phản hồi thất bại."
        );
      }
      setFeedbackByMessageId((prev) => ({ ...prev, [assistantMessageId]: rating }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gửi phản hồi thất bại.");
    } finally {
      setFeedbackLoadingByMessageId((prev) => ({ ...prev, [assistantMessageId]: false }));
    }
  }

  if (shouldHide) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          aria-label="AI chat"
          className="fixed bottom-4 right-4 z-50 h-13 rounded-full border border-slate-900/80 bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_58%,#0f766e_100%)] px-5 text-white shadow-[0_24px_60px_-24px_rgba(15,23,42,0.72)] hover:brightness-105 sm:bottom-5 sm:right-5 sm:h-14 sm:px-6"
        >
          <Sparkles className="size-4 sm:size-5" />
          AI Chat
        </Button>
      </DialogTrigger>

      <DialogContent
        className="h-[min(920px,94vh)] w-[calc(100vw-1rem)] max-w-[1400px] gap-0 overflow-hidden rounded-[32px] border border-slate-200/80 bg-white p-0 shadow-[0_32px_120px_-42px_rgba(15,23,42,0.55)] sm:w-[calc(100vw-2rem)] sm:max-w-[1400px]"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">AI Chat</DialogTitle>

        <div className="grid h-full min-h-0 min-w-0 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="flex min-h-0 min-w-0 flex-col border-b border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#eef6ff_45%,#ecfeff_100%)] xl:border-b-0 xl:border-r">
            <div className="border-b border-slate-200/80 px-6 py-6">
              <Badge className="rounded-full border border-white/70 bg-white/90 px-3 py-1 text-slate-900 shadow-sm hover:bg-white/90">
                <Sparkles className="size-3.5" />
                OpenAI Course Copilot
              </Badge>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                Hỏi trực tiếp về khóa học
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Trợ lý chỉ trả lời từ dữ liệu course, module và lesson hiện có trong hệ thống.
              </p>

              <div className="mt-5 grid gap-3">
                <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
                      <GraduationCap className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">Chat nhiều lượt</p>
                      <p className="text-xs leading-5 text-slate-500">
                        Giữ ngữ cảnh để hỏi tiếp như “khóa này”, “module nào”, “bài nào”.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-sm">
                  <p className="text-sm font-semibold text-slate-900">Phiên hiện tại</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {conversationId
                      ? "Đang giữ mạch hội thoại để trả lời tiếp theo cùng ngữ cảnh."
                      : "Chưa có hội thoại nào được khởi tạo."}
                  </p>
                  {conversationId ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3 rounded-full"
                      onClick={resetConversation}
                    >
                      Làm mới phiên
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Gợi ý mở đầu
                </p>
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendMessage(prompt)}
                    className="w-full rounded-3xl border border-slate-200/80 bg-white/95 px-4 py-3.5 text-left text-sm leading-6 text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <section className="flex min-h-0 min-w-0 flex-col bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200/80 px-6 py-5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">Kognify AI Chat</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Trả lời từ dữ liệu thật, kèm liên kết mở thẳng course, module hoặc lesson.
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="outline" className="rounded-full border-slate-200 bg-white/90 px-3 py-1 text-slate-600">
                  Course data only
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-full"
                  onClick={resetConversation}
                >
                  <RotateCcw className="size-4" />
                  Reset
                </Button>
              </div>
            </div>

            <div
              ref={threadRef}
              className="flex-1 overflow-x-hidden overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.08),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(15,118,110,0.08),transparent_26%),linear-gradient(180deg,#f8fafc_0%,#ffffff_24%,#f8fafc_100%)] px-4 py-5 sm:px-6"
            >
              {messages.length === 0 ? (
                <div className="flex min-h-full flex-col items-center justify-center rounded-[32px] border border-dashed border-slate-200 bg-white/75 px-8 py-12 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  <div className="inline-flex size-16 items-center justify-center rounded-[28px] bg-[linear-gradient(135deg,#0f172a_0%,#0f766e_100%)] text-white shadow-lg">
                    <MessageSquare className="size-7" />
                  </div>
                  <h3 className="mt-6 text-2xl font-semibold tracking-tight text-slate-950">
                    Bắt đầu bằng một câu hỏi cụ thể
                  </h3>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
                    Ví dụ: hỏi về giá, syllabus, số bài học, instructor, hoặc tìm khóa học phù hợp theo chủ đề.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {messages.map((item) => {
                    if (item.role === "user") {
                      return (
                        <div key={item.id} className="flex justify-end">
                          <div className="flex max-w-[min(100%,52rem)] items-end gap-3">
                            <div className="min-w-0 rounded-[30px] bg-[linear-gradient(135deg,#0f172a_0%,#111827_100%)] px-5 py-4 text-[15px] leading-7 text-white shadow-[0_18px_54px_-30px_rgba(15,23,42,0.8)] [overflow-wrap:anywhere]">
                              <p className="m-0 whitespace-pre-wrap">{item.text}</p>
                            </div>
                            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
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

                    return (
                      <div key={item.id} className="flex justify-start">
                        <div className="flex w-full max-w-[min(100%,68rem)] items-start gap-3">
                          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f172a_0%,#0f766e_100%)] text-white shadow-sm">
                            <Sparkles className="size-5" />
                          </span>

                          <div className="min-w-0 flex-1 rounded-[32px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_22px_60px_-36px_rgba(15,23,42,0.42)]">
                            {item.pending ? (
                              <div className="flex items-center gap-2 text-sm text-slate-500">
                                <Loader2 className="size-4 animate-spin" />
                                Đang tra cứu dữ liệu khóa học...
                              </div>
                            ) : (
                              <>
                                <div className="mb-4 flex flex-wrap items-center gap-2">
                                  <Badge className="rounded-full bg-slate-950 px-3 py-1 text-white hover:bg-slate-950">
                                    OpenAI
                                  </Badge>
                                  {item.references.length > 0 ? (
                                    <Badge
                                      variant="outline"
                                      className="rounded-full border-slate-200 bg-white px-3 py-1 text-slate-600"
                                    >
                                      {item.references.length} references
                                    </Badge>
                                  ) : null}
                                </div>

                                <div className="space-y-4 overflow-x-hidden [overflow-wrap:anywhere]">
                                  {renderAssistantContent(item.text)}
                                </div>

                                {item.references.length > 0 ? (
                                  <div className="mt-5 grid gap-3 xl:grid-cols-2">
                                    {item.references.map((reference) => {
                                      const Icon = referenceIcon(reference.kind);
                                      return (
                                        <Link
                                          key={`${reference.kind}-${reference.id}`}
                                          href={reference.url}
                                          className="min-w-0 rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                                        >
                                          <div className="flex items-start gap-3">
                                            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                                              <Icon className="size-4" />
                                            </span>

                                            <span className="min-w-0 flex-1">
                                              <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 ring-1 ring-slate-200">
                                                {reference.kind}
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
                                        className="h-auto max-w-full rounded-full border-slate-200 bg-white px-4 py-2 text-left whitespace-normal [overflow-wrap:anywhere] hover:bg-slate-50"
                                        onClick={() => void sendMessage(question)}
                                      >
                                        {question}
                                      </Button>
                                    ))}
                                  </div>
                                ) : null}

                                {item.assistantMessageId ? (
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

            <div className="shrink-0 border-t border-slate-200/80 bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
              {error ? (
                <div className="mb-3 flex flex-wrap items-center gap-2 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
                  <span className="[overflow-wrap:anywhere]">{error}</span>
                  {lastFailedMessage ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-full border-rose-200 bg-white text-rose-700 hover:bg-rose-100"
                      onClick={() => void sendMessage(lastFailedMessage)}
                    >
                      Thử lại
                    </Button>
                  ) : null}
                </div>
              ) : null}

              <div className="rounded-[32px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-3 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.28)]">
                <Textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                  placeholder="Hỏi về khóa học, module hoặc lesson..."
                  rows={3}
                  className="min-h-[104px] resize-none border-0 bg-transparent px-1 py-1 text-[15px] leading-7 shadow-none focus-visible:ring-0"
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs leading-5 text-slate-500">
                    Shift + Enter để xuống dòng. AI chỉ trả lời theo dữ liệu hiện có.
                  </p>
                  <Button
                    type="button"
                    onClick={() => void sendMessage()}
                    disabled={loading || !message.trim()}
                    className={cn(
                      "rounded-full bg-[linear-gradient(135deg,#0f172a_0%,#0f766e_100%)] px-5 text-white hover:brightness-105",
                      loading && "pointer-events-none"
                    )}
                  >
                    {loading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    Gửi
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
