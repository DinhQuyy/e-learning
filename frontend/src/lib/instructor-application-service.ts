import { directusFetch, getDirectusError } from "@/lib/directus-fetch";
import { CURRENT_USER_FIELDS } from "@/lib/directus-fields";
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  APPLICATION_COOLDOWN_DAYS,
  type InstructorApplicationRecord,
  type InstructorReactivationRequestRecord,
  type InstructorState,
  MAX_DOCUMENT_SIZE_BYTES,
  normalizeInstructorState,
  normalizeRoleName,
} from "@/lib/instructor-application";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const APPLICATION_FIELDS = [
  "id",
  "user_id",
  "track",
  "expertise_categories",
  "expertise_description",
  "portfolio_links",
  "demo_video_link",
  "course_outline",
  "document_urls",
  "terms_accepted",
  "status",
  "admin_note",
  "reviewed_by",
  "reviewed_at",
  "date_created",
  "date_updated",
].join(",");

export const APPLICATION_FIELDS_WITH_USER = [
  "id",
  "track",
  "expertise_categories",
  "expertise_description",
  "portfolio_links",
  "demo_video_link",
  "course_outline",
  "document_urls",
  "terms_accepted",
  "status",
  "admin_note",
  "reviewed_at",
  "date_created",
  "date_updated",
  "user_id.id",
  "user_id.first_name",
  "user_id.last_name",
  "user_id.email",
  "user_id.instructor_state",
  "user_id.role.id",
  "user_id.role.name",
  "reviewed_by.id",
  "reviewed_by.first_name",
  "reviewed_by.last_name",
  "reviewed_by.email",
].join(",");

export const REACTIVATION_REQUEST_FIELDS = [
  "id",
  "user_id",
  "status",
  "reason",
  "admin_note",
  "reviewed_by",
  "reviewed_at",
  "date_created",
  "date_updated",
].join(",");

export const REACTIVATION_REQUEST_FIELDS_WITH_USER = [
  "id",
  "status",
  "reason",
  "admin_note",
  "reviewed_at",
  "date_created",
  "date_updated",
  "user_id.id",
  "user_id.first_name",
  "user_id.last_name",
  "user_id.email",
  "user_id.instructor_state",
  "user_id.role.id",
  "user_id.role.name",
  "reviewed_by.id",
  "reviewed_by.first_name",
  "reviewed_by.last_name",
  "reviewed_by.email",
].join(",");

export interface CurrentUserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  avatar: string | null;
  bio: string | null;
  phone: string | null;
  status: string;
  instructor_state?: InstructorState | null;
  role: string | { id?: string | null; name?: string | null } | null;
  email_verified_at?: string | null;
  phone_verified_at?: string | null;
}

export interface FetchResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

export async function fetchCurrentUserProfile(): Promise<
  FetchResult<CurrentUserProfile>
> {
  const res = await directusFetch(`/users/me?fields=${CURRENT_USER_FIELDS}`);

  if (res.status === 401) {
    return { ok: false, status: 401, data: null, error: "Not authenticated" };
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      data: null,
      error: "Failed to fetch current user",
    };
  }

  const payload = await res.json().catch(() => null);
  const user = (payload?.data ?? null) as CurrentUserProfile | null;

  if (!user?.id) {
    return {
      ok: false,
      status: 500,
      data: null,
      error: "Invalid user payload",
    };
  }

  return { ok: true, status: 200, data: user };
}

export async function fetchLatestApplicationForUser(
  userId: string,
): Promise<FetchResult<InstructorApplicationRecord>> {
  const res = await directusFetch(
    `/items/instructor_applications?fields=${encodeURIComponent(
      APPLICATION_FIELDS,
    )}&filter[user_id][_eq]=${encodeURIComponent(
      userId,
    )}&sort=-date_created&limit=1`,
  );

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      data: null,
      error: "Failed to load application",
    };
  }

  const payload = await res.json().catch(() => null);
  const application = (payload?.data?.[0] ?? null) as
    | InstructorApplicationRecord
    | null;

  return { ok: true, status: 200, data: application };
}

export async function fetchApplicationById(
  id: string,
): Promise<FetchResult<InstructorApplicationRecord>> {
  const res = await directusFetch(
    `/items/instructor_applications/${encodeURIComponent(
      id,
    )}?fields=${encodeURIComponent(APPLICATION_FIELDS_WITH_USER)}`,
  );

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      data: null,
      error: "Failed to load application",
    };
  }

  const payload = await res.json().catch(() => null);
  const application = (payload?.data ?? null) as InstructorApplicationRecord | null;

  return { ok: true, status: 200, data: application };
}

export async function fetchLatestApprovedApplicationForUser(
  userId: string,
): Promise<FetchResult<InstructorApplicationRecord>> {
  const res = await directusFetch(
    `/items/instructor_applications?fields=${encodeURIComponent(
      APPLICATION_FIELDS,
    )}&filter[user_id][_eq]=${encodeURIComponent(
      userId,
    )}&filter[status][_eq]=APPROVED&sort=-date_created&limit=1`,
  );

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      data: null,
      error: "Failed to load approved application",
    };
  }

  const payload = await res.json().catch(() => null);
  const application = (payload?.data?.[0] ?? null) as
    | InstructorApplicationRecord
    | null;

  return { ok: true, status: 200, data: application };
}

export async function fetchLatestReactivationRequestForUser(
  userId: string,
): Promise<FetchResult<InstructorReactivationRequestRecord>> {
  const res = await directusFetch(
    `/items/instructor_reactivation_requests?fields=${encodeURIComponent(
      REACTIVATION_REQUEST_FIELDS,
    )}&filter[user_id][_eq]=${encodeURIComponent(
      userId,
    )}&sort=-date_created&limit=1`,
  );

  if (!res.ok) {
    const detail = await getDirectusError(
      res,
      "Failed to load reactivation request",
    );
    return {
      ok: false,
      status: res.status,
      data: null,
      error: detail,
    };
  }

  const payload = await res.json().catch(() => null);
  const request = (payload?.data?.[0] ?? null) as
    | InstructorReactivationRequestRecord
    | null;

  return { ok: true, status: 200, data: request };
}

export async function fetchReactivationRequestById(
  id: string,
): Promise<FetchResult<InstructorReactivationRequestRecord>> {
  const res = await directusFetch(
    `/items/instructor_reactivation_requests/${encodeURIComponent(
      id,
    )}?fields=${encodeURIComponent(REACTIVATION_REQUEST_FIELDS_WITH_USER)}`,
  );

  if (!res.ok) {
    const detail = await getDirectusError(
      res,
      "Failed to load reactivation request",
    );
    return {
      ok: false,
      status: res.status,
      data: null,
      error: detail,
    };
  }

  const payload = await res.json().catch(() => null);
  const request = (payload?.data ?? null) as
    | InstructorReactivationRequestRecord
    | null;

  return { ok: true, status: 200, data: request };
}

export async function hasPendingReactivationRequest(
  userId: string,
): Promise<boolean> {
  const res = await directusFetch(
    `/items/instructor_reactivation_requests?filter[user_id][_eq]=${encodeURIComponent(
      userId,
    )}&filter[status][_eq]=PENDING&fields=id&limit=1`,
  );

  if (!res.ok) return false;

  const payload = await res.json().catch(() => null);
  return Boolean(payload?.data?.[0]?.id);
}

export function resolveInstructorStateForUser(
  user: Pick<CurrentUserProfile, "instructor_state">,
  hasApprovedApplication: boolean,
): InstructorState {
  const explicitState = normalizeInstructorState(user.instructor_state || undefined);
  if (explicitState !== "NONE") return explicitState;
  return hasApprovedApplication ? "APPROVED" : "NONE";
}

export function getProfileEligibilityError(user: CurrentUserProfile): string | null {
  const role = normalizeRoleName(user.role);
  const instructorState = normalizeInstructorState(
    user.instructor_state || undefined,
  );

  if (role === "admin" || role === "instructor") {
    return "Tài khoản đã có quyền giảng viên";
  }

  if (instructorState === "SUSPENDED") {
    return "Tài khoản giảng viên đang bị tạm khóa. Vui lòng liên hệ quản trị viên";
  }

  if (instructorState === "APPROVED") {
    return "Bạn đã từng được duyệt giảng viên. Vui lòng gửi yêu cầu kích hoạt lại";
  }

  if (user.status !== "active") {
    return "Tài khoản đang bị khóa hoặc không hoạt động";
  }

  if (!user.first_name?.trim() || !user.last_name?.trim()) {
    return "Vui lòng cập nhật đầy đủ họ và tên";
  }

  if (!user.email?.trim()) {
    return "Email không hợp lệ";
  }

  const hasEmailVerificationField = Object.prototype.hasOwnProperty.call(
    user,
    "email_verified_at",
  );

  if (hasEmailVerificationField && !user.email_verified_at) {
    return "Email chưa được xác minh";
  }

  if (!user.avatar) {
    return "Vui lòng cập nhật ảnh đại diện";
  }

  if (!user.bio?.trim()) {
    return "Vui lòng cập nhật bio ngắn để giới thiệu bản thân";
  }

  return null;
}

export function canReapplyAfterRejected(
  application: Pick<InstructorApplicationRecord, "status" | "date_created" | "date_updated"> | null,
): { canApply: boolean; nextApplyAt: string | null } {
  if (!application || application.status !== "REJECTED") {
    return { canApply: true, nextApplyAt: null };
  }

  const baseDate = application.date_updated || application.date_created;
  const baseTimestamp = Date.parse(baseDate);

  if (Number.isNaN(baseTimestamp)) {
    return { canApply: true, nextApplyAt: null };
  }

  const nextApply = new Date(baseTimestamp);
  nextApply.setDate(nextApply.getDate() + APPLICATION_COOLDOWN_DAYS);

  const canApply = Date.now() >= nextApply.getTime();

  return {
    canApply,
    nextApplyAt: canApply ? null : nextApply.toISOString(),
  };
}

export async function hasPendingApplication(userId: string): Promise<boolean> {
  const res = await directusFetch(
    `/items/instructor_applications?filter[user_id][_eq]=${encodeURIComponent(
      userId,
    )}&filter[status][_in]=PENDING,NEEDS_INFO&fields=id&limit=1`,
  );

  if (!res.ok) return false;

  const payload = await res.json().catch(() => null);
  return Boolean(payload?.data?.[0]?.id);
}

export async function validateDocumentReferences(
  documentUrls: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const fileIds: string[] = [];

  for (const documentUrl of documentUrls) {
    const trimmed = documentUrl.trim();
    if (!trimmed) continue;

    const fileId = extractDirectusFileId(trimmed);
    if (fileId) {
      fileIds.push(fileId);
      continue;
    }

    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return { ok: false, error: "Tài liệu bên ngoài phải dùng http/https" };
      }
    } catch {
      return { ok: false, error: "Tài liệu không hợp lệ" };
    }
  }

  if (fileIds.length === 0) {
    return { ok: true };
  }

  const res = await directusFetch(
    `/files?fields=id,type,filesize&filter[id][_in]=${fileIds.join(",")}&limit=-1`,
  );

  if (!res.ok) {
    return { ok: false, error: "Không thể xác minh tài liệu đã tải lên" };
  }

  const payload = await res.json().catch(() => null);
  const files: Array<{ id: string; type?: string | null; filesize?: number | null }> =
    payload?.data ?? [];

  const byId = new Map(files.map((file) => [file.id, file]));

  for (const fileId of fileIds) {
    const file = byId.get(fileId);
    if (!file) {
      return { ok: false, error: "Tài liệu đã tải lên không tồn tại" };
    }

    if (!file.type || !ALLOWED_DOCUMENT_MIME_TYPES.includes(file.type as (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number])) {
      return { ok: false, error: "Chỉ hỗ trợ tài liệu PDF, JPG, PNG" };
    }

    const size = typeof file.filesize === "number" ? file.filesize : 0;
    if (size > MAX_DOCUMENT_SIZE_BYTES) {
      return { ok: false, error: "Tài liệu vượt quá giới hạn 10MB" };
    }
  }

  return { ok: true };
}

export async function createApplicationHistory(
  applicationId: string,
  fromStatus: string | null,
  toStatus: string,
  changedBy: string | null,
  note?: string | null,
): Promise<void> {
  await directusFetch("/items/application_history", {
    method: "POST",
    body: JSON.stringify({
      application_id: applicationId,
      from_status: fromStatus,
      to_status: toStatus,
      changed_by: changedBy,
      note: note ?? null,
    }),
  }).catch(() => undefined);
}

export async function resolveRoleIdByName(
  roleName: "student" | "instructor" | "admin",
): Promise<string | null> {
  const normalized = roleName === "admin" ? "administrator" : roleName;

  const res = await directusFetch("/roles?fields=id,name&limit=-1");
  if (!res.ok) return null;

  const payload = await res.json().catch(() => null);
  const roles: Array<{ id: string; name?: string | null }> = payload?.data ?? [];

  const matched = roles.find(
    (role) => role.name?.toLowerCase() === normalized,
  );

  return matched?.id ?? null;
}

export function isAdminUser(user: Pick<CurrentUserProfile, "role">): boolean {
  return normalizeRoleName(user.role) === "admin";
}

export function isInstructorUser(
  user: Pick<CurrentUserProfile, "role">,
): boolean {
  return normalizeRoleName(user.role) === "instructor";
}

function extractDirectusFileId(value: string): string | null {
  if (UUID_REGEX.test(value)) return value;

  const assetMatch = value.match(/\/assets\/([0-9a-f-]{36})/i);
  if (assetMatch?.[1] && UUID_REGEX.test(assetMatch[1])) {
    return assetMatch[1];
  }

  const proxiedMatch = value.match(/\/api\/assets\/([0-9a-f-]{36})/i);
  if (proxiedMatch?.[1] && UUID_REGEX.test(proxiedMatch[1])) {
    return proxiedMatch[1];
  }

  return null;
}
