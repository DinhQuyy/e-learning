"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Loader2, MailCheck, MailWarning } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api-fetch";
import { useAuthStore } from "@/stores/auth-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MentorEmailPreferencePayload {
  enabled: boolean;
  accountEmail: string;
  activeNotificationEmail: string | null;
  activeNotificationEmailVerified: boolean;
  pendingNotificationEmail: string | null;
  pendingVerificationExpiresAt: string | null;
  effectiveEmail: string | null;
  usingAccountEmail: boolean;
}

interface MentorEmailPreferencesCardProps {
  accountEmail: string;
  initialEnabled?: boolean | null;
  initialActiveNotificationEmail?: string | null;
  initialActiveNotificationEmailVerified?: boolean | null;
  initialPendingNotificationEmail?: string | null;
  initialPendingVerificationExpiresAt?: string | null;
}

function normalizeEmail(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function formatExpiry(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return format(date, "HH:mm 'ngày' dd/MM/yyyy", { locale: vi });
}

export function MentorEmailPreferencesCard({
  accountEmail,
  initialEnabled = true,
  initialActiveNotificationEmail = null,
  initialActiveNotificationEmailVerified = false,
  initialPendingNotificationEmail = null,
  initialPendingVerificationExpiresAt = null,
}: MentorEmailPreferencesCardProps) {
  const router = useRouter();
  const fetchUser = useAuthStore((s) => s.fetchUser);

  const [enabled, setEnabled] = useState(initialEnabled !== false);
  const [activeNotificationEmail, setActiveNotificationEmail] = useState(
    initialActiveNotificationEmail
  );
  const [activeNotificationEmailVerified, setActiveNotificationEmailVerified] =
    useState(Boolean(initialActiveNotificationEmailVerified));
  const [pendingNotificationEmail, setPendingNotificationEmail] = useState(
    initialPendingNotificationEmail
  );
  const [pendingVerificationExpiresAt, setPendingVerificationExpiresAt] =
    useState(initialPendingVerificationExpiresAt);
  const [emailInput, setEmailInput] = useState(
    initialPendingNotificationEmail ??
      initialActiveNotificationEmail ??
      accountEmail
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEnabled(initialEnabled !== false);
    setActiveNotificationEmail(initialActiveNotificationEmail);
    setActiveNotificationEmailVerified(Boolean(initialActiveNotificationEmailVerified));
    setPendingNotificationEmail(initialPendingNotificationEmail);
    setPendingVerificationExpiresAt(initialPendingVerificationExpiresAt);
    setEmailInput(
      initialPendingNotificationEmail ??
        initialActiveNotificationEmail ??
        accountEmail
    );
  }, [
    accountEmail,
    initialActiveNotificationEmail,
    initialActiveNotificationEmailVerified,
    initialEnabled,
    initialPendingNotificationEmail,
    initialPendingVerificationExpiresAt,
  ]);

  const normalizedAccountEmail = normalizeEmail(accountEmail);
  const normalizedInput = normalizeEmail(emailInput);
  const currentEffectiveEmail =
    enabled
      ? activeNotificationEmail && activeNotificationEmailVerified
        ? activeNotificationEmail
        : normalizedAccountEmail
      : null;
  const isUsingAccountEmail =
    !activeNotificationEmail || !activeNotificationEmailVerified;
  const hasPendingVerification = Boolean(pendingNotificationEmail);
  const hasChanges =
    enabled !== (initialEnabled !== false) ||
    normalizedInput !==
      normalizeEmail(
        initialPendingNotificationEmail ??
          initialActiveNotificationEmail ??
          accountEmail
      );
  const expiryLabel = formatExpiry(pendingVerificationExpiresAt);

  const primaryButtonLabel = useMemo(() => {
    if (!enabled) return "Lưu cài đặt";
    if (!normalizedInput || normalizedInput === normalizedAccountEmail) {
      return "Dùng email đăng nhập";
    }
    if (pendingNotificationEmail && normalizedInput === normalizeEmail(pendingNotificationEmail)) {
      return "Gửi lại email xác minh";
    }
    if (
      activeNotificationEmail &&
      activeNotificationEmailVerified &&
      normalizedInput === normalizeEmail(activeNotificationEmail)
    ) {
      return "Lưu cài đặt";
    }
    return "Lưu và gửi xác minh";
  }, [
    activeNotificationEmail,
    activeNotificationEmailVerified,
    enabled,
    normalizedAccountEmail,
    normalizedInput,
    pendingNotificationEmail,
  ]);

  async function refreshUserContext() {
    await fetchUser();
    router.refresh();
  }

  async function savePreference(targetEmail?: string) {
    setIsSaving(true);
    try {
      const res = await apiFetch("/api/auth/mentor-notification-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notification_email: targetEmail ?? emailInput,
          enabled,
        }),
      });

      const payload = (await res.json().catch(() => null)) as
        | {
            error?: string;
            warning?: string | null;
            save_status?: string;
            verification_sent?: boolean;
            preference?: MentorEmailPreferencePayload;
          }
        | null;

      if (!res.ok || !payload?.preference) {
        throw new Error(
          payload?.error || "Không thể lưu email nhận nhắc học."
        );
      }

      const nextPreference = payload.preference;
      setEnabled(nextPreference.enabled);
      setActiveNotificationEmail(nextPreference.activeNotificationEmail);
      setActiveNotificationEmailVerified(
        nextPreference.activeNotificationEmailVerified
      );
      setPendingNotificationEmail(nextPreference.pendingNotificationEmail);
      setPendingVerificationExpiresAt(
        nextPreference.pendingVerificationExpiresAt
      );
      setEmailInput(
        nextPreference.pendingNotificationEmail ??
          nextPreference.activeNotificationEmail ??
          nextPreference.accountEmail
      );

      await refreshUserContext();

      if (payload.warning) {
        toast.warning(payload.warning);
      } else if (payload.save_status === "verification_sent") {
        toast.success("Đã gửi email xác minh cho địa chỉ bạn vừa chọn.");
      } else if (payload.save_status === "using_account_email") {
        toast.success("Đã chuyển email nhắc học về email đăng nhập.");
      } else {
        toast.success("Đã lưu cài đặt email nhắc học.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể lưu email nhận nhắc học."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MailCheck className="size-5" />
          Email nhận nhắc học
        </CardTitle>
        <CardDescription>
          Chọn địa chỉ email bạn muốn nhận thông báo nhắc học từ giảng viên và
          AI Mentor.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <Checkbox
            id="mentor-email-enabled"
            checked={enabled}
            onCheckedChange={(checked) => setEnabled(checked === true)}
            className="mt-0.5"
          />
          <div className="space-y-1">
            <Label htmlFor="mentor-email-enabled" className="text-sm font-medium">
              Bật email nhắc học
            </Label>
            <p className="text-sm text-muted-foreground">
              Khi tắt, hệ thống chỉ gửi thông báo trong ứng dụng và không gửi
              email nhắc học.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mentor-notification-email">Email nhận nhắc học</Label>
          <Input
            id="mentor-notification-email"
            type="email"
            value={emailInput}
            onChange={(event) => setEmailInput(event.target.value)}
            placeholder={accountEmail}
            disabled={isSaving}
          />
          <p className="text-xs text-muted-foreground">
            Để dùng email đăng nhập, hãy để trống hoặc nhập đúng email đăng nhập
            hiện tại.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-900">
              Email đang được dùng:
            </span>
            <Badge variant="secondary">
              {currentEffectiveEmail ?? "Đã tắt email nhắc học"}
            </Badge>
            {enabled ? (
              isUsingAccountEmail ? (
                <Badge variant="outline">Email đăng nhập</Badge>
              ) : (
                <Badge variant="outline">Email riêng đã xác minh</Badge>
              )
            ) : (
              <Badge variant="outline">Chỉ thông báo trong app</Badge>
            )}
          </div>

          {hasPendingVerification ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <div className="flex items-start gap-2">
                <MailWarning className="mt-0.5 size-4 shrink-0" />
                <div className="space-y-1">
                  <p>
                    Email <span className="font-semibold">{pendingNotificationEmail}</span>{" "}
                    đang chờ xác minh.
                  </p>
                  <p className="text-amber-800">
                    Trước khi xác minh xong, hệ thống vẫn gửi nhắc học về{" "}
                    <span className="font-semibold">
                      {currentEffectiveEmail ?? accountEmail}
                    </span>
                    .
                  </p>
                  {expiryLabel ? (
                    <p className="text-amber-800">
                      Liên kết xác minh hết hạn vào {expiryLabel}.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-3">
          {hasPendingVerification ? (
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => {
                void savePreference(pendingNotificationEmail ?? emailInput);
              }}
            >
              Gửi lại email xác minh
            </Button>
          ) : null}

          {enabled && normalizedInput !== normalizedAccountEmail ? (
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => {
                setEmailInput(accountEmail);
              }}
            >
              Dùng email đăng nhập
            </Button>
          ) : null}

          <Button
            type="button"
            disabled={isSaving || !hasChanges}
            onClick={() => {
              void savePreference();
            }}
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
            {primaryButtonLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
