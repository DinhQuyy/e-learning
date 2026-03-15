import "server-only";

import { randomBytes } from "crypto";

import { sendTextEmail } from "@/lib/mail";
import { resolveUserRole, type AppRole } from "@/lib/role-routing";
import { getServerEnv } from "@/lib/server-env";

const DIRECTUS_URL =
  process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://localhost:8055";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface MentorPreferenceUser {
  id: string;
  email: string | null;
  role?: string | { id?: string | null; name?: string | null } | null;
  mentor_notification_email_enabled?: boolean | null;
  mentor_notification_email?: string | null;
  mentor_notification_email_verified?: boolean | null;
  mentor_notification_email_pending?: string | null;
  mentor_notification_email_verification_token?: string | null;
  mentor_notification_email_verification_expires_at?: string | null;
}

export interface MentorNotificationEmailPreference {
  enabled: boolean;
  accountEmail: string;
  activeNotificationEmail: string | null;
  activeNotificationEmailVerified: boolean;
  pendingNotificationEmail: string | null;
  pendingVerificationExpiresAt: string | null;
  effectiveEmail: string | null;
  usingAccountEmail: boolean;
}

type SaveMentorNotificationEmailResult =
  | {
      status: "using_account_email" | "saved" | "verification_sent";
      verificationSent: boolean;
      preference: MentorNotificationEmailPreference;
    }
  | {
      status: "verification_send_failed";
      verificationSent: false;
      preference: MentorNotificationEmailPreference;
      error: string;
    };

type VerifyMentorNotificationEmailResult =
  | {
      status: "verified";
      email: string;
      userId: string;
      role: AppRole;
      preference: MentorNotificationEmailPreference;
    }
  | {
      status: "invalid_token" | "expired_token" | "missing_token";
      error: string;
    };

const mentorNotificationFieldDefinitions = [
  {
    field: "mentor_notification_email_enabled",
    type: "boolean",
    meta: {
      interface: "boolean",
      note: "Bật/tắt email nhắc học từ AI Mentor",
    },
    schema: { default_value: true },
  },
  {
    field: "mentor_notification_email",
    type: "string",
    meta: {
      interface: "input",
      note: "Email nhận nhắc học đã xác minh",
    },
    schema: { max_length: 255, is_nullable: true },
  },
  {
    field: "mentor_notification_email_verified",
    type: "boolean",
    meta: {
      interface: "boolean",
      note: "Trạng thái xác minh email nhắc học",
      hidden: true,
    },
    schema: { default_value: false },
  },
  {
    field: "mentor_notification_email_pending",
    type: "string",
    meta: {
      interface: "input",
      note: "Email nhắc học đang chờ xác minh",
      hidden: true,
    },
    schema: { max_length: 255, is_nullable: true },
  },
  {
    field: "mentor_notification_email_verification_token",
    type: "string",
    meta: {
      interface: "input",
      note: "Token xác minh email nhắc học",
      hidden: true,
    },
    schema: { max_length: 255, is_nullable: true },
  },
  {
    field: "mentor_notification_email_verification_expires_at",
    type: "timestamp",
    meta: {
      interface: "datetime",
      note: "Thời gian hết hạn xác minh email nhắc học",
      hidden: true,
    },
    schema: { is_nullable: true },
  },
];

let mentorFieldsEnsured = false;
let mentorFieldsEnsurePromise: Promise<void> | null = null;

function normalizeEmail(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getDirectusStaticToken(): string {
  const token = getServerEnv("DIRECTUS_STATIC_TOKEN");
  if (!token) {
    throw new Error("Thiếu DIRECTUS_STATIC_TOKEN để quản lý email nhắc học.");
  }
  return token;
}

async function directusAdminFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getDirectusStaticToken();
  const headers = new Headers(options.headers);

  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (
    options.body &&
    !(typeof FormData !== "undefined" && options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${DIRECTUS_URL}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });
}

async function ensureMentorNotificationFieldsInternal() {
  for (const definition of mentorNotificationFieldDefinitions) {
    const response = await directusAdminFetch("/fields/directus_users", {
      method: "POST",
      body: JSON.stringify(definition),
    });

    if (response.ok) {
      continue;
    }

    const text = await response.text();
    const lower = text.toLowerCase();
    if (
      response.status === 400 &&
      (lower.includes("already") ||
        lower.includes("duplicate") ||
        lower.includes("exists"))
    ) {
      continue;
    }

    throw new Error(
      `Không thể tạo field ${definition.field}: ${response.status} ${text}`
    );
  }
}

export async function ensureMentorNotificationFields() {
  if (mentorFieldsEnsured) {
    return;
  }

  if (!mentorFieldsEnsurePromise) {
    mentorFieldsEnsurePromise = ensureMentorNotificationFieldsInternal()
      .then(() => {
        mentorFieldsEnsured = true;
      })
      .finally(() => {
        mentorFieldsEnsurePromise = null;
      });
  }

  await mentorFieldsEnsurePromise;
}

function mapUserToPreference(
  user: MentorPreferenceUser
): MentorNotificationEmailPreference {
  const accountEmail = normalizeEmail(user.email);
  const enabled = user.mentor_notification_email_enabled !== false;
  const activeNotificationEmail = normalizeEmail(user.mentor_notification_email) || null;
  const activeNotificationEmailVerified =
    Boolean(activeNotificationEmail) && Boolean(user.mentor_notification_email_verified);
  const pendingNotificationEmail =
    normalizeEmail(user.mentor_notification_email_pending) || null;
  const pendingVerificationExpiresAt =
    user.mentor_notification_email_verification_expires_at ?? null;
  const effectiveEmail = !enabled
    ? null
    : activeNotificationEmail && activeNotificationEmailVerified
      ? activeNotificationEmail
      : accountEmail || null;
  const usingAccountEmail =
    enabled && (!activeNotificationEmail || !activeNotificationEmailVerified);

  return {
    enabled,
    accountEmail,
    activeNotificationEmail,
    activeNotificationEmailVerified,
    pendingNotificationEmail,
    pendingVerificationExpiresAt,
    effectiveEmail,
    usingAccountEmail,
  };
}

async function fetchMentorPreferenceUserById(
  userId: string
): Promise<MentorPreferenceUser> {
  const response = await directusAdminFetch(
    `/users/${encodeURIComponent(userId)}?fields=*`
  );

  if (!response.ok) {
    throw new Error("Không thể tải cài đặt email nhắc học của người dùng.");
  }

  const data = await response.json().catch(() => null);
  return data?.data as MentorPreferenceUser;
}

async function fetchMentorPreferenceUserByToken(
  token: string
): Promise<MentorPreferenceUser | null> {
  const response = await directusAdminFetch(
    `/users?filter[mentor_notification_email_verification_token][_eq]=${encodeURIComponent(token)}&limit=1&fields=*,role.id,role.name`
  );

  if (!response.ok) {
    throw new Error("Không thể kiểm tra token xác minh email nhắc học.");
  }

  const data = await response.json().catch(() => null);
  const user = data?.data?.[0];
  return user ? (user as MentorPreferenceUser) : null;
}

async function updateMentorPreferenceUser(
  userId: string,
  payload: Record<string, unknown>
): Promise<MentorPreferenceUser> {
  const response = await directusAdminFetch(`/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Không thể lưu cài đặt email nhắc học. ${text}`);
  }

  const data = await response.json().catch(() => null);
  return data?.data as MentorPreferenceUser;
}

function buildVerificationEmailMessage(email: string, verificationUrl: string): string {
  return [
    `Chào bạn,`,
    "",
    `Bạn vừa chọn ${email} làm email nhận nhắc học từ AI Mentor.`,
    "",
    "Để bắt đầu nhận email nhắc học ở địa chỉ này, hãy xác minh bằng cách mở liên kết bên dưới:",
    verificationUrl,
    "",
    "Lưu ý:",
    "- Liên kết xác minh có hiệu lực trong 24 giờ.",
    "- Trước khi xác minh xong, hệ thống vẫn gửi nhắc học về email đăng nhập hiện tại của bạn.",
    "- Nếu bạn không yêu cầu thay đổi này, hãy bỏ qua email này.",
    "",
    "E-Learning Platform",
  ].join("\n");
}

export async function getMentorNotificationPreference(
  userId: string
): Promise<MentorNotificationEmailPreference> {
  const user = await fetchMentorPreferenceUserById(userId);
  return mapUserToPreference(user);
}

export async function resolveMentorNotificationRecipient(userId: string): Promise<{
  enabled: boolean;
  accountEmail: string | null;
  recipientEmail: string | null;
  source: "account" | "custom" | "disabled";
}> {
  const preference = await getMentorNotificationPreference(userId);

  if (!preference.enabled) {
    return {
      enabled: false,
      accountEmail: preference.accountEmail || null,
      recipientEmail: null,
      source: "disabled",
    };
  }

  if (
    preference.activeNotificationEmail &&
    preference.activeNotificationEmailVerified
  ) {
    return {
      enabled: true,
      accountEmail: preference.accountEmail || null,
      recipientEmail: preference.activeNotificationEmail,
      source: "custom",
    };
  }

  return {
    enabled: true,
    accountEmail: preference.accountEmail || null,
    recipientEmail: preference.accountEmail || null,
    source: "account",
  };
}

export async function saveMentorNotificationEmailPreference({
  userId,
  notificationEmail,
  enabled,
}: {
  userId: string;
  notificationEmail: string | null | undefined;
  enabled: boolean;
}): Promise<SaveMentorNotificationEmailResult> {
  await ensureMentorNotificationFields();

  const currentUser = await fetchMentorPreferenceUserById(userId);
  const accountEmail = normalizeEmail(currentUser.email);
  const desiredEmail = normalizeEmail(notificationEmail);

  if (desiredEmail && !isValidEmail(desiredEmail)) {
    throw new Error("Email nhận nhắc học không hợp lệ.");
  }

  if (!desiredEmail || desiredEmail === accountEmail) {
    const updatedUser = await updateMentorPreferenceUser(userId, {
      mentor_notification_email_enabled: enabled,
      mentor_notification_email: null,
      mentor_notification_email_verified: false,
      mentor_notification_email_pending: null,
      mentor_notification_email_verification_token: null,
      mentor_notification_email_verification_expires_at: null,
    });

    return {
      status: "using_account_email",
      verificationSent: false,
      preference: mapUserToPreference(updatedUser),
    };
  }

  const currentActiveEmail = normalizeEmail(currentUser.mentor_notification_email);
  const currentActiveVerified = Boolean(currentUser.mentor_notification_email_verified);

  if (desiredEmail === currentActiveEmail && currentActiveVerified) {
    const updatedUser = await updateMentorPreferenceUser(userId, {
      mentor_notification_email_enabled: enabled,
      mentor_notification_email_pending: null,
      mentor_notification_email_verification_token: null,
      mentor_notification_email_verification_expires_at: null,
    });

    return {
      status: "saved",
      verificationSent: false,
      preference: mapUserToPreference(updatedUser),
    };
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const updatedUser = await updateMentorPreferenceUser(userId, {
    mentor_notification_email_enabled: enabled,
    mentor_notification_email_pending: desiredEmail,
    mentor_notification_email_verification_token: token,
    mentor_notification_email_verification_expires_at: expiresAt,
  });

  const verificationUrl = new URL("/verify-mentor-email", APP_URL);
  verificationUrl.searchParams.set("token", token);

  const emailResult = await sendTextEmail({
    to: desiredEmail,
    subject: "Xác minh email nhận nhắc học từ AI Mentor",
    text: buildVerificationEmailMessage(desiredEmail, verificationUrl.toString()),
  });

  if (!emailResult.ok) {
    return {
      status: "verification_send_failed",
      verificationSent: false,
      preference: mapUserToPreference(updatedUser),
      error:
        "Đã lưu email chờ xác minh nhưng chưa gửi được thư xác minh. Vui lòng thử lại.",
    };
  }

  return {
    status: "verification_sent",
    verificationSent: true,
    preference: mapUserToPreference(updatedUser),
  };
}

export async function verifyMentorNotificationEmailToken(
  token: string | null | undefined
): Promise<VerifyMentorNotificationEmailResult> {
  await ensureMentorNotificationFields();

  const normalizedToken = typeof token === "string" ? token.trim() : "";
  if (!normalizedToken) {
    return {
      status: "missing_token",
      error: "Thiếu token xác minh email nhắc học.",
    };
  }

  const user = await fetchMentorPreferenceUserByToken(normalizedToken);
  if (!user) {
    return {
      status: "invalid_token",
      error: "Liên kết xác minh không hợp lệ hoặc đã được sử dụng.",
    };
  }

  const pendingEmail = normalizeEmail(user.mentor_notification_email_pending);
  const expiresAt = user.mentor_notification_email_verification_expires_at;

  if (!pendingEmail) {
    return {
      status: "invalid_token",
      error: "Không tìm thấy email chờ xác minh cho liên kết này.",
    };
  }

  if (!expiresAt || Number.isNaN(Date.parse(expiresAt)) || Date.parse(expiresAt) < Date.now()) {
    await updateMentorPreferenceUser(user.id, {
      mentor_notification_email_verification_token: null,
      mentor_notification_email_verification_expires_at: null,
    });

    return {
      status: "expired_token",
      error: "Liên kết xác minh đã hết hạn. Vui lòng gửi lại email xác minh.",
    };
  }

  const updatedUser = await updateMentorPreferenceUser(user.id, {
    mentor_notification_email: pendingEmail,
    mentor_notification_email_verified: true,
    mentor_notification_email_pending: null,
    mentor_notification_email_verification_token: null,
    mentor_notification_email_verification_expires_at: null,
  });

  return {
    status: "verified",
    email: pendingEmail,
    userId: user.id,
    role: resolveUserRole(user.role ?? null),
    preference: mapUserToPreference(updatedUser),
  };
}
