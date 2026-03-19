"use client";

import { usePathname } from "next/navigation";
import { GraduationCap, RotateCcw, ShieldAlert, Sparkles } from "lucide-react";

import { AiChatPanel } from "@/components/features/ai-chat-panel";
import { AiSurfaceState } from "@/components/features/ai-surface-state";
import { QUIZ_RESTRICTED_STARTER_PROMPTS, useAiUi } from "@/components/providers/ai-ui-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { trackAiEvent } from "@/lib/ai-tracking";

const HIDDEN_PATH_PREFIXES = ["/login", "/register", "/forgot-password", "/reset-password"];

function surfaceLabel(surface: string): string {
  switch (surface) {
    case "dashboard_coach":
      return "Huấn luyện viên học tập";
    case "course_advisor":
      return "Cố vấn khóa học";
    case "lesson_study":
      return "Trợ lý học bài";
    case "quiz_restricted":
      return "Quiz giới hạn";
    case "quiz_mistake_review":
      return "Phân tích lỗi";
    case "instructor_review_copilot":
      return "Trợ lý chấm bài";
    default:
      return "Trò chuyện chung";
  }
}

export function AiChatWidget() {
  const pathname = usePathname() ?? "/";
  const {
    open,
    setOpen,
    pageContext,
    openChat,
    sendMessage,
    resetConversation,
    conversationId,
  } = useAiUi();

  const shouldHide = HIDDEN_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (shouldHide) {
    return null;
  }

  const hideFloatingTrigger = pageContext.surface === "lesson_study";
  const restrictedMode = pageContext.surface === "quiz_restricted";
  const starterPrompts = restrictedMode ? QUIZ_RESTRICTED_STARTER_PROMPTS : pageContext.starterPrompts;

  const handleStarterPrompt = (prompt: string) => {
    trackAiEvent(restrictedMode ? "restricted_allowed_prompt_click" : "starter_prompt_click", {
      surface: pageContext.surface,
      current_path: pageContext.currentPath,
    });
    void sendMessage(prompt);
  };

  return (
    <>
      {!hideFloatingTrigger ? (
        <Button
          type="button"
          aria-label="AI chat"
          onClick={() => openChat()}
          className="ai-action-primary fixed right-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40 min-h-12 max-w-[calc(100vw-1.5rem)] rounded-full border border-slate-900/80 px-4 py-3 text-sm shadow-[0_24px_60px_-24px_rgba(15,23,42,0.72)] sm:right-5 sm:bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] sm:min-h-14 sm:px-6 sm:text-base"
        >
          <Sparkles className="size-4 sm:size-5" />
          Hỏi AI
        </Button>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="h-[100dvh] max-h-[100dvh] w-screen max-w-none gap-0 overflow-hidden rounded-none border-0 bg-white p-0 sm:h-[min(920px,94dvh)] sm:max-h-[94dvh] sm:w-[calc(100vw-2rem)] sm:max-w-[1400px] sm:rounded-[32px] sm:border sm:border-slate-200/80 sm:shadow-[0_32px_120px_-42px_rgba(15,23,42,0.55)]"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">Trò chuyện AI</DialogTitle>

          <div className="grid h-full min-h-0 min-w-0 lg:grid-cols-[minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="hidden min-h-0 min-w-0 flex-col border-r border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#eef6ff_45%,#ecfeff_100%)] xl:flex">
              <div className="border-b border-slate-200/80 px-6 py-6">
                <Badge className="ai-badge ai-badge--neutral px-3 py-1 shadow-sm">
                  {restrictedMode ? <ShieldAlert className="size-3.5" /> : <Sparkles className="size-3.5" />}
                  {restrictedMode ? "Chế độ bài kiểm tra" : "Trợ lý AI"}
                </Badge>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                  {pageContext.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">{pageContext.description}</p>
                {restrictedMode ? (
                  <AiSurfaceState
                    state="restricted"
                    title="Chế độ giới hạn trong bài kiểm tra"
                    description="AI chỉ hỗ trợ cách nộp bài, điều hướng, thời gian và nơi xem lại sau khi nộp trong lúc bạn đang làm quiz."
                    className="mt-4"
                  />
                ) : null}

                <div className="mt-5 grid gap-3">
                  <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
                        <GraduationCap className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">Ngữ cảnh hiện tại</p>
                        <p className="text-xs leading-5 text-slate-500">
                          {pageContext.lessonTitle
                            ? `${pageContext.lessonTitle} • ${pageContext.courseTitle ?? "Bài học"}`
                            : pageContext.courseTitle ?? pageContext.currentPath}
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
                  {starterPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleStarterPrompt(prompt)}
                      className="w-full rounded-3xl border border-slate-200/80 bg-white/95 px-4 py-3.5 text-left text-sm leading-6 text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            <section className="flex min-h-0 min-w-0 flex-col bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
              <div className="flex shrink-0 flex-col gap-3 border-b border-slate-200/80 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6 sm:py-5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">Trò chuyện cùng Kiwi AI</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{pageContext.description}</p>
                  {restrictedMode ? (
                    <AiSurfaceState
                      state="restricted"
                      title="Chế độ kiểm tra đang bật"
                      description="AI sẽ từ chối mọi yêu cầu có thể làm lộ đáp án."
                      className="mt-3"
                    />
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 sm:justify-end">
                  <Badge className="ai-badge ai-badge--soft ai-badge--neutral hidden sm:inline-flex">
                    {surfaceLabel(pageContext.surface)}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-full"
                    onClick={resetConversation}
                  >
                    <RotateCcw className="size-4" />
                    Đặt lại
                  </Button>
                </div>
              </div>

              <div className="border-b border-slate-200/70 px-4 py-3 xl:hidden">
                <div className="flex flex-wrap gap-2">
                  {starterPrompts.map((prompt) => (
                    <Button
                      key={prompt}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-auto rounded-full border-slate-200 bg-white px-4 py-2 text-left whitespace-normal"
                      onClick={() => handleStarterPrompt(prompt)}
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>

              <AiChatPanel
                emptyTitle={
                  restrictedMode ? "AI đang ở chế độ giới hạn cho quiz" : "Bắt đầu bằng một câu hỏi cụ thể"
                }
                emptyDescription={
                  restrictedMode
                    ? "Trong lúc làm quiz, bạn chỉ nên hỏi về cách nộp bài, thời gian, lượt làm và nơi xem lại sau khi nộp."
                    : "Hỏi về khóa học, bài học, cách dùng hệ thống hoặc nhờ giải thích nội dung theo ngữ cảnh hiện tại."
                }
                inputPlaceholder={
                  restrictedMode
                    ? "Hỏi về cách nộp bài, thời gian hoặc điều hướng quiz..."
                    : "Nhập câu hỏi của bạn..."
                }
              />
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
