import { NextRequest, NextResponse } from "next/server";

import { ensureEnrollment, getAiUserContext } from "@/lib/ai-auth";
import { callAiApiWithMeta } from "@/lib/ai-client";
import { mentorResponseSchema } from "@/lib/ai-schemas";
import { directusFetch } from "@/lib/directus-fetch";

type LessonRow = {
  id: string;
  title: string;
  slug: string;
};

type ProgressRow = {
  lesson_id?: unknown;
  completed?: boolean | null;
  completed_at?: string | null;
  date_updated?: string | null;
};

function toDate(value: unknown): Date | null {
  if (!value || typeof value !== "string") return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function normalizeId(value: unknown): string {
  if (typeof value === "string") return value;
  if (
    value &&
    typeof value === "object" &&
    "id" in value &&
    typeof (value as { id?: unknown }).id === "string"
  ) {
    return (value as { id: string }).id;
  }
  return "";
}

async function buildMentorContext(userId: string, courseId: string) {
  const enrollmentRes = await directusFetch(
    `/items/enrollments?filter[user_id][_eq]=${encodeURIComponent(userId)}&filter[course_id][_eq]=${encodeURIComponent(courseId)}&limit=1&fields=id,progress_percentage,date_created`
  );

  const enrollmentPayload = enrollmentRes.ok ? await enrollmentRes.json().catch(() => null) : null;
  const enrollment = enrollmentPayload?.data?.[0];
  const enrollmentId = enrollment?.id ? String(enrollment.id) : null;

  const lessonsRes = await directusFetch(
    `/items/modules?filter[course_id][_eq]=${encodeURIComponent(courseId)}&fields=lessons.id,lessons.title,lessons.slug&deep[lessons][_filter][status][_eq]=published&limit=-1`
  );
  const lessonsPayload = lessonsRes.ok ? await lessonsRes.json().catch(() => null) : null;
  const lessons: LessonRow[] = [];

  for (const moduleRow of lessonsPayload?.data ?? []) {
    const moduleLessons = Array.isArray(moduleRow?.lessons) ? moduleRow.lessons : [];
    for (const lesson of moduleLessons) {
      if (lesson?.id && lesson?.slug) {
        lessons.push({
          id: String(lesson.id),
          title: String(lesson.title ?? "Lesson"),
          slug: String(lesson.slug),
        });
      }
    }
  }

  let completedSet = new Set<string>();
  let lastActivity: Date | null = null;

  if (enrollmentId) {
    const progressRes = await directusFetch(
      `/items/progress?filter[enrollment_id][_eq]=${encodeURIComponent(enrollmentId)}&fields=lesson_id,completed,completed_at,date_updated&limit=-1`
    );

    if (progressRes.ok) {
      const progressPayload = await progressRes.json().catch(() => null);
      const rows: ProgressRow[] = Array.isArray(progressPayload?.data)
        ? progressPayload.data
        : [];

      completedSet = new Set(
        rows
          .filter((row) => !!row?.completed)
          .map((row) => normalizeId(row.lesson_id))
          .filter(Boolean)
      );

      for (const row of rows) {
        const updated = toDate(row?.date_updated) ?? toDate(row?.completed_at);
        if (updated && (!lastActivity || updated > lastActivity)) {
          lastActivity = updated;
        }
      }
    }
  }

  const pendingLessons = lessons
    .filter((lesson) => !completedSet.has(lesson.id))
    .slice(0, 10)
    .map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      href: "/my-courses",
      eta_min: 20,
    }));

  const progressPct = Number(enrollment?.progress_percentage ?? 0);

  return {
    metrics: {
      progress_pct: Number.isFinite(progressPct) ? progressPct : 0,
      streak_days: 0,
      last_activity:
        (lastActivity ?? toDate(enrollment?.date_created))?.toISOString().slice(0, 10) ?? null,
    },
    last_activity_at: (lastActivity ?? toDate(enrollment?.date_created))?.toISOString() ?? null,
    pending_lessons: pendingLessons,
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAiUserContext();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const courseId = request.nextUrl.searchParams.get("courseId");
    if (!courseId) {
      return NextResponse.json({ error: "Missing courseId" }, { status: 400 });
    }

    if (user.role === "student") {
      const enrolled = await ensureEnrollment(user.userId, courseId);
      if (!enrolled) {
        return NextResponse.json({ error: "Enrollment required" }, { status: 403 });
      }
    }

    const context = await buildMentorContext(user.userId, courseId);

    const result = await callAiApiWithMeta(
      "/v1/mentor/summary",
      {
        user_id: user.userId,
        role: user.role,
        course_id: courseId,
        context,
      },
      mentorResponseSchema
    );

    return NextResponse.json({
      data: result.data,
      meta: {
        conversation_id: result.conversationId,
        assistant_message_id: result.assistantMessageId,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI mentor error" },
      { status: 500 }
    );
  }
}
