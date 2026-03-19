"use client";

import { usePathname } from "next/navigation";
import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { apiPost } from "@/lib/api-fetch";
import { trackAiEvent } from "@/lib/ai-tracking";
import type { AiSurface, ChatReference, ChatResponse } from "@/lib/ai-schemas";

export type ThreadMessage =
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
      policy?: boolean;
    };

type AiPageContextValue = {
  surface: AiSurface;
  title: string;
  description: string;
  starterPrompts: string[];
  currentPath: string;
  courseId?: string;
  lessonId?: string;
  courseTitle?: string;
  lessonTitle?: string;
};

type AiPageContextInput = Partial<Omit<AiPageContextValue, "currentPath">> & {
  currentPath?: string;
};

type OpenChatOptions = {
  prefill?: string;
  open?: boolean;
  contextOverride?: Partial<AiPageContextValue>;
};

type AiUiContextValue = {
  open: boolean;
  setOpen: (value: boolean) => void;
  composerDraft: string;
  setComposerDraft: (value: string) => void;
  conversationId: string | null;
  messages: ThreadMessage[];
  loading: boolean;
  error: string | null;
  lastFailedMessage: string | null;
  feedbackByMessageId: Record<string, 1 | -1 | null>;
  feedbackLoadingByMessageId: Record<string, boolean>;
  pageContext: AiPageContextValue;
  registerPageContext: (value: AiPageContextInput | null) => void;
  setPriorityPageContext: (value: AiPageContextInput | null) => void;
  sendMessage: (rawMessage?: string) => Promise<void>;
  sendFeedback: (assistantMessageId: string, rating: 1 | -1) => Promise<void>;
  resetConversation: () => void;
  openChat: (options?: OpenChatOptions) => void;
};

const FALLBACK_GENERIC_PROMPTS = [
  "Làm sao để đăng ký một khóa học?",
  "Tôi xem tiến độ học tập ở đâu?",
  "Khi nào tôi nhận được chứng chỉ?",
];

export const QUIZ_RESTRICTED_POLICY_ANSWER =
  "Trong lúc bạn đang làm quiz, AI không thể cung cấp đáp án, kiểm tra lựa chọn đúng hay sai, hoặc hướng dẫn giải theo cách làm lộ đáp án. Tôi chỉ có thể hỗ trợ cách nộp bài, điều hướng, thời gian và nơi xem lại sau khi nộp.";

export const QUIZ_RESTRICTED_STARTER_PROMPTS = [
  "Làm sao để nộp bài?",
  "Tôi còn bao nhiêu lượt làm?",
  "Sau khi nộp tôi xem lại ở đâu?",
];

const AiUiContext = createContext<AiUiContextValue | null>(null);

function buildFallbackPageContext(pathname: string): AiPageContextValue {
  if (pathname === "/dashboard") {
    return {
      surface: "dashboard_coach",
      title: "Bảng điều khiển học tập",
      description: "Gợi ý học tiếp, nhắc việc còn dở và hỗ trợ dùng hệ thống.",
      starterPrompts: [
        "Giải thích vì sao đây là bài học tôi nên học tiếp.",
        "Tôi đang chậm ở khóa nào?",
        "Làm sao xem chi tiết tiến độ học tập?",
      ],
      currentPath: pathname,
    };
  }

  if (/^\/learn\/[^/]+\/[^/]+/.test(pathname)) {
    return {
      surface: "lesson_study",
      title: "Bài học hiện tại",
      description: "Tóm tắt, giải thích và hỏi đáp bám theo bài học đang mở.",
      starterPrompts: [
        "Tóm tắt bài học này.",
        "Giải thích bài này theo cách dễ hiểu hơn.",
        "Cho tôi 3 ý chính của bài học này.",
      ],
      currentPath: pathname,
    };
  }

  if (/^\/courses\/[^/]+/.test(pathname)) {
    return {
      surface: "course_advisor",
      title: "Khóa học hiện tại",
      description: "Hỏi về nội dung, độ phù hợp, mức độ hoặc cách đăng ký khóa học.",
      starterPrompts: [
        "Khóa học này phù hợp với ai?",
        "Tóm tắt nhanh nội dung khóa học này.",
        "Làm sao để đăng ký khóa học này?",
      ],
      currentPath: pathname,
    };
  }

  return {
    surface: "global_chat",
    title: "Kiwi AI",
    description: "Hỏi đáp chung, hỗ trợ khóa học và cách sử dụng hệ thống.",
    starterPrompts: FALLBACK_GENERIC_PROMPTS,
    currentPath: pathname,
  };
}

export function AiUiProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const [registeredContext, setRegisteredContext] = useState<AiPageContextInput | null>(null);
  const [runtimeContextOverride, setRuntimeContextOverride] = useState<Partial<AiPageContextValue> | null>(null);
  const [priorityContextOverride, setPriorityContextOverride] = useState<AiPageContextInput | null>(null);
  const [open, setOpen] = useState(false);
  const [composerDraft, setComposerDraft] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [feedbackByMessageId, setFeedbackByMessageId] = useState<Record<string, 1 | -1 | null>>({});
  const [feedbackLoadingByMessageId, setFeedbackLoadingByMessageId] = useState<Record<string, boolean>>({});
  const previousPathRef = useRef(pathname);

  useEffect(() => {
    if (previousPathRef.current !== pathname) {
      previousPathRef.current = pathname;
      setRegisteredContext(null);
      setRuntimeContextOverride(null);
      setPriorityContextOverride(null);
    }
  }, [pathname]);

  const pageContext = useMemo(() => {
    const fallback = buildFallbackPageContext(pathname);
    return {
      ...fallback,
      ...(registeredContext ?? {}),
      ...(runtimeContextOverride ?? {}),
      ...(priorityContextOverride ?? {}),
      currentPath:
        priorityContextOverride?.currentPath ??
        runtimeContextOverride?.currentPath ??
        registeredContext?.currentPath ??
        pathname,
      starterPrompts:
        priorityContextOverride?.starterPrompts && priorityContextOverride.starterPrompts.length > 0
          ? priorityContextOverride.starterPrompts
          : runtimeContextOverride?.starterPrompts && runtimeContextOverride.starterPrompts.length > 0
            ? runtimeContextOverride.starterPrompts
            : registeredContext?.starterPrompts && registeredContext.starterPrompts.length > 0
              ? registeredContext.starterPrompts
              : fallback.starterPrompts,
    };
  }, [pathname, priorityContextOverride, registeredContext, runtimeContextOverride]);

  const registerPageContext = useCallback((value: AiPageContextInput | null) => {
    setRegisteredContext(value);
  }, []);

  const setPriorityPageContext = useCallback((value: AiPageContextInput | null) => {
    setPriorityContextOverride(value);
  }, []);

  const resetConversation = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setComposerDraft("");
    setError(null);
    setLastFailedMessage(null);
    setFeedbackByMessageId({});
    setFeedbackLoadingByMessageId({});
    setRuntimeContextOverride(null);
  }, []);

  const openChat = useCallback(
    (options?: OpenChatOptions) => {
      setOpen(options?.open ?? true);
      setRuntimeContextOverride(options?.contextOverride ?? null);
      if (options?.prefill) {
        setComposerDraft(options.prefill);
      }
      const effectiveSurface =
        priorityContextOverride?.surface ?? options?.contextOverride?.surface ?? pageContext.surface;
      const effectivePath =
        priorityContextOverride?.currentPath ??
        options?.contextOverride?.currentPath ??
        pageContext.currentPath;
      trackAiEvent(effectiveSurface === "quiz_restricted" ? "restricted_chat_open" : "chat_open", {
        surface: effectiveSurface,
        current_path: effectivePath,
      });
    },
    [pageContext.currentPath, pageContext.surface, priorityContextOverride]
  );

  const sendMessage = useCallback(
    async (rawMessage?: string) => {
      const nextMessage = (rawMessage ?? composerDraft).trim();
      if (!nextMessage || loading) return;

      const userMessageId = `user-${Date.now()}`;
      const pendingMessageId = `assistant-pending-${Date.now()}`;

      setLoading(true);
      setError(null);
      setLastFailedMessage(null);
      setComposerDraft("");
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
      trackAiEvent("message_send", {
        surface: pageContext.surface,
        current_path: pageContext.currentPath,
      });

      try {
        const res = await apiPost("/api/ai/chat", {
          message: nextMessage,
          conversation_id: conversationId,
          current_path: pageContext.currentPath,
          course_id: pageContext.courseId,
          lesson_id: pageContext.lessonId,
          surface: pageContext.surface,
        });
        const payload = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(
            typeof payload?.error === "string" ? payload.error : "Không thể gọi Trợ lý AI."
          );
        }

        const data = (payload?.data ?? null) as ChatResponse | null;
        const nextConversationId =
          typeof payload?.meta?.conversation_id === "string" ? payload.meta.conversation_id : null;
        const assistantMessageId =
          typeof payload?.meta?.assistant_message_id === "string"
            ? payload.meta.assistant_message_id
            : null;

        if (!data) {
          throw new Error("Phản hồi từ Trợ lý AI không hợp lệ.");
        }

        const isRestrictedPolicy =
          pageContext.surface === "quiz_restricted" && data.answer === QUIZ_RESTRICTED_POLICY_ANSWER;
        if (isRestrictedPolicy) {
          trackAiEvent("restricted_prompt_blocked", {
            current_path: pageContext.currentPath,
          });
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
                  policy: isRestrictedPolicy,
                }
              : item
          )
        );
      } catch (err) {
        const messageText = err instanceof Error ? err.message : "Không thể gọi Trợ lý AI.";
        setError(messageText);
        setLastFailedMessage(nextMessage);
        setMessages((prev) => prev.filter((item) => item.id !== pendingMessageId));
      } finally {
        setLoading(false);
      }
    },
    [composerDraft, conversationId, loading, pageContext]
  );

  const sendFeedback = useCallback(
    async (assistantMessageId: string, rating: 1 | -1) => {
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
        trackAiEvent(rating === 1 ? "feedback_helpful" : "feedback_not_helpful", {
          surface: pageContext.surface,
          current_path: pageContext.currentPath,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gửi phản hồi thất bại.");
      } finally {
        setFeedbackLoadingByMessageId((prev) => ({ ...prev, [assistantMessageId]: false }));
      }
    },
    [conversationId, feedbackLoadingByMessageId, pageContext.currentPath, pageContext.surface]
  );

  const value = useMemo<AiUiContextValue>(
    () => ({
      open,
      setOpen,
      composerDraft,
      setComposerDraft,
      conversationId,
      messages,
      loading,
      error,
      lastFailedMessage,
      feedbackByMessageId,
      feedbackLoadingByMessageId,
      pageContext,
      registerPageContext,
      setPriorityPageContext,
      sendMessage,
      sendFeedback,
      resetConversation,
      openChat,
    }),
    [
      composerDraft,
      conversationId,
      error,
      feedbackByMessageId,
      feedbackLoadingByMessageId,
      lastFailedMessage,
      loading,
      messages,
      open,
      pageContext,
      registerPageContext,
      setPriorityPageContext,
      resetConversation,
      openChat,
      sendMessage,
      sendFeedback,
    ]
  );

  return <AiUiContext.Provider value={value}>{children}</AiUiContext.Provider>;
}

export function AiPageContextBridge({ value }: { value: AiPageContextInput }) {
  const { registerPageContext } = useAiUi();

  useEffect(() => {
    registerPageContext(value);
    return () => {
      registerPageContext(null);
    };
  }, [registerPageContext, value]);

  return null;
}

export function useAiUi() {
  const context = useContext(AiUiContext);
  if (!context) {
    throw new Error("useAiUi must be used within AiUiProvider");
  }
  return context;
}
