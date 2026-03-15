"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, Mail, Send, Zap } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { apiPost } from "@/lib/api-fetch";

type ActionType = "nudge" | "micro_plan" | "recovery_plan";
type RiskBand = "low" | "medium" | "high";

interface InstructorRiskActionsProps {
  studentId: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  courseSlug?: string | null;
  riskBand: RiskBand;
  recommendedAction: string;
}

interface MentorInterventionResponse {
  channels?: {
    email?: boolean;
    emailMode?: "actual" | "override" | "dev_fallback" | "unresolved";
    emailRecipient?: string | null;
  };
  error?: string;
}

export function InstructorRiskActions({
  studentId,
  studentName,
  courseId,
  courseTitle,
  courseSlug,
  riskBand,
  recommendedAction,
}: InstructorRiskActionsProps) {
  const [pendingAction, setPendingAction] = useState<ActionType | null>(null);
  const [lastSentLabel, setLastSentLabel] = useState<string | null>(null);

  const secondaryAction: ActionType =
    riskBand === "high" ? "recovery_plan" : "micro_plan";
  const secondaryLabel =
    riskBand === "high" ? "Gửi kế hoạch phục hồi" : "Gửi kế hoạch 15 phút";

  async function sendAction(actionType: ActionType, successLabel: string) {
    if (pendingAction) return;

    setPendingAction(actionType);
    try {
      const res = await apiPost("/api/instructor/mentor-interventions", {
        student_id: studentId,
        student_name: studentName,
        course_id: courseId,
        course_title: courseTitle,
        course_slug: courseSlug ?? null,
        action_type: actionType,
        risk_band: riskBand,
        recommended_action: recommendedAction,
      });

      const payload = (await res.json().catch(() => null)) as MentorInterventionResponse | null;
      if (!res.ok) {
        throw new Error(payload?.error || "Không gửi được can thiệp");
      }

      setLastSentLabel(successLabel);
      const emailSuffix = payload?.channels?.email
        ? payload.channels.emailRecipient
          ? payload.channels.emailMode === "override" ||
            payload.channels.emailMode === "dev_fallback"
            ? ` và email test tới ${payload.channels.emailRecipient}`
            : ` và email tới ${payload.channels.emailRecipient}`
          : " và email"
        : "";

      toast.success(
        `${successLabel}: đã gửi thông báo trong hệ thống${emailSuffix}.`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không gửi được can thiệp"
      );
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="min-w-[190px] space-y-2">
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full justify-start gap-1"
          disabled={pendingAction !== null}
          onClick={() => {
            void sendAction("nudge", "Gửi nhắc học");
          }}
        >
          {pendingAction === "nudge" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          Gửi nhắc học
        </Button>

        <Button
          type="button"
          size="sm"
          className="w-full justify-start gap-1"
          disabled={pendingAction !== null}
          onClick={() => {
            void sendAction(secondaryAction, secondaryLabel);
          }}
        >
          {pendingAction === secondaryAction ? (
            <Loader2 className="size-4 animate-spin" />
          ) : riskBand === "high" ? (
            <Mail className="size-4" />
          ) : (
            <Zap className="size-4" />
          )}
          {secondaryLabel}
        </Button>

        <Button asChild size="sm" variant="ghost" className="w-full justify-start">
          <Link
            href={{
              pathname: `/instructor/courses/${courseId}/students`,
              query: { studentId },
            }}
          >
            Xem học viên
          </Link>
        </Button>
      </div>

      {lastSentLabel ? (
        <p className="text-xs leading-relaxed text-slate-500">
          {lastSentLabel} đã được ghi nhận.
        </p>
      ) : null}
    </div>
  );
}
