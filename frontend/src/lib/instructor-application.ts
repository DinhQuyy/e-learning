import { z } from "zod";

export const INSTRUCTOR_APPLICATION_TRACKS = [
  "PORTFOLIO",
  "DEMO",
  "DOCUMENT",
] as const;

export const INSTRUCTOR_APPLICATION_STATUSES = [
  "PENDING",
  "NEEDS_INFO",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const;

export const INSTRUCTOR_REACTIVATION_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const;

export const INSTRUCTOR_STATES = [
  "NONE",
  "APPROVED",
  "SUSPENDED",
  "REVOKED",
] as const;

export const APPLICATION_COOLDOWN_DAYS = 7;
export const MAX_DOCUMENT_FILES = 3;
export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export type InstructorApplicationTrack =
  (typeof INSTRUCTOR_APPLICATION_TRACKS)[number];

export type InstructorApplicationStatus =
  (typeof INSTRUCTOR_APPLICATION_STATUSES)[number];

export type InstructorReactivationStatus =
  (typeof INSTRUCTOR_REACTIVATION_STATUSES)[number];

export type InstructorState = (typeof INSTRUCTOR_STATES)[number];

export type RoleLike =
  | string
  | {
      id?: string | null;
      name?: string | null;
    }
  | null
  | undefined;

export interface InstructorApplicationRecord {
  id: string;
  user_id:
    | string
    | {
        id: string;
        first_name?: string | null;
        last_name?: string | null;
        email?: string | null;
        instructor_state?: InstructorState | null;
        role?: RoleLike;
      };
  track: InstructorApplicationTrack;
  expertise_categories: string[];
  expertise_description: string;
  portfolio_links: string[];
  demo_video_link: string | null;
  course_outline: string | null;
  document_urls: string[];
  terms_accepted: boolean;
  status: InstructorApplicationStatus;
  admin_note: string | null;
  reviewed_by?:
    | string
    | {
        id: string;
        first_name?: string | null;
        last_name?: string | null;
        email?: string | null;
      }
    | null;
  reviewed_at?: string | null;
  date_created: string;
  date_updated: string | null;
}

export interface InstructorReactivationRequestRecord {
  id: string;
  user_id:
    | string
    | {
        id: string;
        first_name?: string | null;
        last_name?: string | null;
        email?: string | null;
        instructor_state?: InstructorState | null;
        role?: RoleLike;
      };
  status: InstructorReactivationStatus;
  reason: string | null;
  admin_note: string | null;
  reviewed_by?:
    | string
    | {
        id: string;
        first_name?: string | null;
        last_name?: string | null;
        email?: string | null;
      }
    | null;
  reviewed_at?: string | null;
  date_created: string;
  date_updated: string | null;
}

export const instructorApplicationTrackLabel: Record<
  InstructorApplicationTrack,
  string
> = {
  PORTFOLIO: "Năng lực / Portfolio",
  DEMO: "Dạy thử",
  DOCUMENT: "Hồ sơ giấy tờ",
};

export const instructorApplicationStatusLabel: Record<
  InstructorApplicationStatus,
  string
> = {
  PENDING: "Chờ duyệt",
  NEEDS_INFO: "Cần bổ sung",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  CANCELLED: "Đã hủy",
};

export const instructorReactivationStatusLabel: Record<
  InstructorReactivationStatus,
  string
> = {
  PENDING: "Chờ duyệt kích hoạt lại",
  APPROVED: "Đã duyệt kích hoạt lại",
  REJECTED: "Từ chối kích hoạt lại",
  CANCELLED: "Đã hủy yêu cầu",
};

export const instructorStateLabel: Record<InstructorState, string> = {
  NONE: "Chưa có tư cách giảng viên",
  APPROVED: "Đã từng được duyệt giảng viên",
  SUSPENDED: "Giảng viên tạm khóa",
  REVOKED: "Tư cách giảng viên đã bị thu hồi",
};

const applicationUrlSchema = z
  .string()
  .trim()
  .url("Liên kết không hợp lệ")
  .refine((value) => /^https?:\/\//i.test(value), {
    message: "Liên kết phải bắt đầu bằng http:// hoặc https://",
  });

const baseSchema = z.object({
  track: z.enum(INSTRUCTOR_APPLICATION_TRACKS),
  expertise_categories: z
    .array(z.string().trim().min(1, "Danh mục không được để trống"))
    .min(1, "Vui lòng nhập ít nhất 1 lĩnh vực")
    .max(12, "Tối đa 12 lĩnh vực"),
  expertise_description: z
    .string()
    .trim()
    .min(30, "Mô tả chuyên môn tối thiểu 30 ký tự")
    .max(3000, "Mô tả chuyên môn tối đa 3000 ký tự"),
  portfolio_links: z.array(applicationUrlSchema).max(5, "Tối đa 5 liên kết"),
  demo_video_link: z.string().trim().optional(),
  course_outline: z.string().trim().optional(),
  document_urls: z
    .array(z.string().trim().min(1, "Tài liệu không hợp lệ"))
    .max(MAX_DOCUMENT_FILES, `Tối đa ${MAX_DOCUMENT_FILES} tài liệu`),
  terms_accepted: z
    .boolean()
    .refine((value) => value, "Bạn cần đồng ý điều khoản giảng viên"),
});

export const instructorApplicationSubmissionSchema =
  baseSchema.superRefine((value, ctx) => {
    if (value.track === "DEMO") {
      if (!value.demo_video_link) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["demo_video_link"],
          message: "Track dạy thử bắt buộc video demo",
        });
      } else if (!applicationUrlSchema.safeParse(value.demo_video_link).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["demo_video_link"],
          message: "Link video demo không hợp lệ",
        });
      }

      if (!value.course_outline) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["course_outline"],
          message: "Track dạy thử bắt buộc đề cương khóa học",
        });
      }
    }

    if (value.track === "PORTFOLIO" && value.portfolio_links.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["portfolio_links"],
        message: "Track portfolio bắt buộc ít nhất 1 liên kết",
      });
    }

    if (value.track === "DOCUMENT" && value.document_urls.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["document_urls"],
        message: "Track giấy tờ bắt buộc ít nhất 1 tài liệu",
      });
    }
  });

export type InstructorApplicationSubmissionInput = z.input<
  typeof instructorApplicationSubmissionSchema
>;

export type InstructorApplicationSubmissionPayload = z.output<
  typeof instructorApplicationSubmissionSchema
>;

export function normalizeApplicationPayload(
  input: InstructorApplicationSubmissionInput,
): InstructorApplicationSubmissionPayload {
  const normalized: InstructorApplicationSubmissionInput = {
    ...input,
    expertise_categories: uniqueClean(input.expertise_categories),
    portfolio_links: uniqueClean(input.portfolio_links),
    document_urls: uniqueClean(input.document_urls),
    demo_video_link: input.demo_video_link?.trim() || undefined,
    course_outline: input.course_outline?.trim() || undefined,
  };

  const parsed = instructorApplicationSubmissionSchema.parse(normalized);

  return {
    ...parsed,
    demo_video_link: parsed.demo_video_link || "",
    course_outline: parsed.course_outline || "",
  };
}

export function coerceSubmissionInput(
  value: unknown,
): InstructorApplicationSubmissionInput {
  const raw =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};

  return {
    track:
      typeof raw.track === "string" &&
      INSTRUCTOR_APPLICATION_TRACKS.includes(
        raw.track as InstructorApplicationTrack,
      )
        ? (raw.track as InstructorApplicationTrack)
        : "PORTFOLIO",
    expertise_categories: Array.isArray(raw.expertise_categories)
      ? raw.expertise_categories
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
      : [],
    expertise_description:
      typeof raw.expertise_description === "string"
        ? raw.expertise_description
        : "",
    portfolio_links: Array.isArray(raw.portfolio_links)
      ? raw.portfolio_links
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
      : [],
    demo_video_link:
      typeof raw.demo_video_link === "string" ? raw.demo_video_link : "",
    course_outline:
      typeof raw.course_outline === "string" ? raw.course_outline : "",
    document_urls: Array.isArray(raw.document_urls)
      ? raw.document_urls
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
      : [],
    terms_accepted: Boolean(raw.terms_accepted),
  };
}

function uniqueClean(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const cleaned = value.trim();
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    result.push(cleaned);
  }

  return result;
}

export function splitCommaSeparated(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function splitLineSeparated(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function joinLineSeparated(values: string[] | null | undefined): string {
  if (!values || values.length === 0) return "";
  return values.join("\n");
}

export function joinCommaSeparated(values: string[] | null | undefined): string {
  if (!values || values.length === 0) return "";
  return values.join(", ");
}

export function normalizeRoleName(role: RoleLike): string {
  if (!role) return "student";

  const raw = typeof role === "string" ? role : role.name || "";
  const value = raw.toLowerCase().trim();

  if (value === "administrator" || value === "admin") return "admin";
  if (value === "instructor") return "instructor";
  return "student";
}

export function normalizeInstructorState(
  raw: string | null | undefined,
): InstructorState {
  const value = raw?.toUpperCase().trim() || "NONE";
  if (INSTRUCTOR_STATES.includes(value as InstructorState)) {
    return value as InstructorState;
  }
  return "NONE";
}
