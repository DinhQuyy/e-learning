import { asArray, getDirectusItemId, normalizeCriterionScores, sumCriterionScores } from "@/lib/assignment-route-utils";

type NormalizedArtifact = NonNullable<ReturnType<typeof normalizeArtifact>>;
type NormalizedSubmission = NonNullable<ReturnType<typeof normalizeSubmission>>;

function isDefined<T>(value: T | null | undefined): value is T {
  return value != null;
}

function displayName(user: Record<string, unknown> | null | undefined): string {
  if (!user || typeof user !== "object") return "Học viên";
  const first = String(user.first_name ?? "").trim();
  const last = String(user.last_name ?? "").trim();
  const full = `${first} ${last}`.trim();
  return full || String(user.email ?? "Học viên");
}

export function normalizeReview(review: unknown) {
  if (!review || typeof review !== "object") return null;
  const row = review as Record<string, unknown>;
  const id = String(row.id ?? "").trim();
  if (!id) return null;
  const criterionScores = normalizeCriterionScores(row.criterion_scores);
  return {
    id,
    status: String(row.status ?? "draft") as "draft" | "finalized",
    final_score:
      Number.isFinite(Number(row.final_score)) && Number(row.final_score) > 0
        ? Number(row.final_score)
        : sumCriterionScores(criterionScores),
    criterion_scores: criterionScores,
    final_feedback: row.final_feedback ? String(row.final_feedback) : "",
    reviewer: row.reviewer_id && typeof row.reviewer_id === "object"
      ? {
          id: String((row.reviewer_id as Record<string, unknown>).id ?? ""),
          name: displayName(row.reviewer_id as Record<string, unknown>),
        }
      : null,
  };
}

export function normalizeArtifact(artifact: unknown) {
  if (!artifact || typeof artifact !== "object") return null;
  const row = artifact as Record<string, unknown>;
  return {
    id: String(row.id ?? ""),
    applied_state: String(row.applied_state ?? "pending") as "pending" | "applied" | "ignored",
    payload:
      row.payload && typeof row.payload === "object"
        ? (row.payload as Record<string, unknown>)
        : null,
    date_created: row.date_created ? String(row.date_created) : null,
  };
}

export function normalizeSubmission(submission: unknown) {
  if (!submission || typeof submission !== "object") return null;
  const row = submission as Record<string, unknown>;
  const review = normalizeReview(asArray(row.review)[0] ?? row.review);
  const artifacts: NormalizedArtifact[] = asArray(row.ai_artifacts)
    .map(normalizeArtifact)
    .filter(isDefined);
  const user = row.user_id && typeof row.user_id === "object"
    ? (row.user_id as Record<string, unknown>)
    : null;
  return {
    id: String(row.id ?? ""),
    status: String(row.status ?? "submitted") as "submitted" | "reviewed",
    body_text: String(row.body_text ?? ""),
    reference_url: row.reference_url ? String(row.reference_url) : "",
    submitted_at: row.submitted_at ? String(row.submitted_at) : null,
    reviewed_at: row.reviewed_at ? String(row.reviewed_at) : null,
    user: user
      ? {
          id: String(user.id ?? ""),
          name: displayName(user),
          email: String(user.email ?? ""),
        }
      : null,
    review,
    ai_artifacts: artifacts,
  };
}

export function normalizeAssignment(assignment: unknown) {
  if (!assignment || typeof assignment !== "object") return null;
  const row = assignment as Record<string, unknown>;
  const rubricSource = asArray(row.rubric)[0] ?? row.rubric;
  const rubric = rubricSource && typeof rubricSource === "object"
    ? (rubricSource as Record<string, unknown>)
    : null;
  const criteria = asArray(rubric?.criteria)
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const criterion = item as Record<string, unknown>;
      return {
        id: String(criterion.id ?? ""),
        title: String(criterion.title ?? ""),
        description: criterion.description ? String(criterion.description) : "",
        max_points: Number(criterion.max_points ?? 0),
        scoring_guidance: criterion.scoring_guidance ? String(criterion.scoring_guidance) : "",
        sort: Number(criterion.sort ?? 0),
      };
    })
    .filter(
      (
        value
      ): value is {
        id: string;
        title: string;
        description: string;
        max_points: number;
        scoring_guidance: string;
        sort: number;
      } => Boolean(value)
    )
    .sort((a, b) => a.sort - b.sort);

  const submissions: NormalizedSubmission[] = asArray(row.submissions)
    .map(normalizeSubmission)
    .filter(isDefined);
  const lesson = row.lesson_id && typeof row.lesson_id === "object"
    ? (row.lesson_id as Record<string, unknown>)
    : null;
  const needsReviewCount = submissions.filter(
    (submission) => !submission.review || submission.review.status !== "finalized"
  ).length;
  const reviewedCount = submissions.filter(
    (submission) => submission.review?.status === "finalized"
  ).length;

  return {
    id: String(row.id ?? ""),
    title: String(row.title ?? ""),
    instructions: String(row.instructions ?? ""),
    due_at: row.due_at ? String(row.due_at) : null,
    max_score: Number(row.max_score ?? criteria.reduce((acc, item) => acc + item.max_points, 0)),
    status: String(row.status ?? "draft") as "draft" | "published" | "archived",
    lesson: lesson
      ? {
          id: String(lesson.id ?? ""),
          title: String(lesson.title ?? ""),
          slug: String(lesson.slug ?? ""),
        }
      : {
          id: getDirectusItemId(row.lesson_id) ?? "",
          title: "",
          slug: "",
        },
    rubric: {
      id: rubric ? String(rubric.id ?? "") : "",
      title: rubric ? String(rubric.title ?? "Rubric") : "Rubric",
      criteria,
    },
    submissions,
    counts: {
      total: submissions.length,
      needs_review: needsReviewCount,
      reviewed: reviewedCount,
    },
    date_created: row.date_created ? String(row.date_created) : null,
    date_updated: row.date_updated ? String(row.date_updated) : null,
  };
}
