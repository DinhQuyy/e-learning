"use client";

export type AiEventName =
  | "chat_open"
  | "restricted_chat_open"
  | "message_send"
  | "feedback_helpful"
  | "feedback_not_helpful"
  | "starter_prompt_click"
  | "restricted_allowed_prompt_click"
  | "restricted_prompt_blocked"
  | "restricted_banner_impression"
  | "coach_cta_click"
  | "lesson_study_refresh"
  | "continue_in_chat"
  | "lesson_reference_open"
  | "lesson_reference_filter_change"
  | "lesson_reference_click"
  | "mistake_review_load"
  | "mistake_review_cta_click";

export function trackAiEvent(name: AiEventName, payload: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  const detail = {
    name,
    payload,
    timestamp: Date.now(),
  };

  window.dispatchEvent(new CustomEvent("kognify:ai-event", { detail }));

  const analyticsWindow = window as typeof window & {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
  };

  if (Array.isArray(analyticsWindow.dataLayer)) {
    analyticsWindow.dataLayer.push({ event: name, ...payload });
  }

  if (typeof analyticsWindow.gtag === "function") {
    analyticsWindow.gtag("event", name, payload);
  }

  const telemetryPayload = JSON.stringify({
    event_name: name,
    surface: typeof payload.surface === "string" ? payload.surface : null,
    current_path: typeof payload.current_path === "string" ? payload.current_path : null,
    payload,
    timestamp: detail.timestamp,
  });

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([telemetryPayload], { type: "application/json" });
    navigator.sendBeacon("/api/ai/events", blob);
    return;
  }

  void fetch("/api/ai/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: telemetryPayload,
    keepalive: true,
    credentials: "same-origin",
  }).catch(() => undefined);
}
