import type { Enrollment } from "@/types";

export type EnrollmentDerivedStatus = "active" | "completed" | "cancelled";

export type NormalizedEnrollment = Enrollment & {
  derivedStatus: EnrollmentDerivedStatus;
  progress: number;
};

const clampProgress = (value: unknown): number => {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  if (numeric < 0) return 0;
  if (numeric > 100) return 100;
  return numeric;
};

export const normalizeEnrollment = (
  enrollment: Enrollment
): NormalizedEnrollment => {
  const progress = clampProgress(enrollment.progress_percentage);
  const derivedStatus: EnrollmentDerivedStatus =
    enrollment.status === "cancelled"
      ? "cancelled"
      : progress >= 99.5
        ? "completed"
        : "active";

  return { ...enrollment, derivedStatus, progress };
};

export const partitionEnrollments = (enrollments: Enrollment[]) => {
  const normalized = enrollments.map(normalizeEnrollment);

  return {
    normalized,
    active: normalized.filter((enrollment) => enrollment.derivedStatus === "active"),
    completed: normalized.filter((enrollment) => enrollment.derivedStatus === "completed"),
  };
};
