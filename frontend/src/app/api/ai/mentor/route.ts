import { NextRequest, NextResponse } from "next/server";

import { ensureEnrollment, getAiUserContext } from "@/lib/ai-auth";
import { callAiApiWithMeta } from "@/lib/ai-client";
import { mentorResponseSchema } from "@/lib/ai-schemas";
import { directusFetch } from "@/lib/directus-fetch";

type CourseInfo = {
  id: string;
  title: string;
  slug: string;
};

type EnrollmentRow = {
  id: string;
  progress_percentage?: number | null;
  date_created?: string | null;
  course_id?: CourseInfo | string | null;
};

type LessonRow = {
  id: string;
  title: string;
  slug: string;
  duration?: number | null;
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

function estimateEtaMinutes(durationSeconds: unknown): number {
  const duration = Number(durationSeconds ?? 0);
  if (!Number.isFinite(duration) || duration <= 0) return 15;
  return Math.max(5, Math.min(45, Math.ceil(duration / 60)));
}

function parseCourseIds(request: NextRequest): string[] {
  const fromList = request.nextUrl.searchParams.get("courseIds");
  const single = request.nextUrl.searchParams.get("courseId");
  const candidates = (fromList ? fromList.split(",") : single ? [single] : [])
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(new Set(candidates));
}

async function buildCourseMentorContext(
  userId: string,
  courseId: string
) {
  const enrollmentRes = await directusFetch(
    `/items/enrollments?filter[user_id][_eq]=${encodeURIComponent(userId)}&filter[course_id][_eq]=${encodeURIComponent(courseId)}&limit=1&fields=id,progress_percentage,date_created,course_id.id,course_id.title,course_id.slug`
  );

  const enrollmentPayload = enrollmentRes.ok ? await enrollmentRes.json().catch(() => null) : null;
  const enrollment = enrollmentPayload?.data?.[0] as EnrollmentRow | undefined;
  const enrollmentId = enrollment?.id ? String(enrollment.id) : null;
  const courseRaw = enrollment?.course_id;
  const course =
    courseRaw && typeof courseRaw === "object"
      ? {
          id: String(courseRaw.id),
          title: String(courseRaw.title ?? "Khóa học"),
          slug: String(courseRaw.slug ?? ""),
        }
      : null;

  if (!course || !course.slug) {
    return null;
  }

  const lessonsRes = await directusFetch(
    `/items/modules?filter[course_id][_eq]=${encodeURIComponent(courseId)}&fields=lessons.id,lessons.title,lessons.slug,lessons.duration&deep[lessons][_filter][status][_eq]=published&limit=-1`
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
          duration: Number(lesson.duration ?? 0),
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
      href: `/learn/${course.slug}/${lesson.slug}`,
      eta_min: estimateEtaMinutes(lesson.duration),
    }));

  return {
    course_id: course.id,
    course_title: course.title,
    course_slug: course.slug,
    progress_pct: Number(enrollment?.progress_percentage ?? 0),
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

    const courseIds = parseCourseIds(request);
    if (courseIds.length === 0) {
      return NextResponse.json({ error: "Missing courseIds" }, { status: 400 });
    }

    if (user.role === "student") {
      const enrollmentChecks = await Promise.all(
        courseIds.map(async (courseId) => ({
          courseId,
          enrolled: await ensureEnrollment(user.userId, courseId),
        }))
      );
      const enrolledCourseIds = enrollmentChecks
        .filter((item) => item.enrolled)
        .map((item) => item.courseId);
      if (enrolledCourseIds.length === 0) {
        return NextResponse.json({ error: "Enrollment required" }, { status: 403 });
      }

      const courseContexts = (
        await Promise.all(
          enrolledCourseIds.map((courseId) => buildCourseMentorContext(user.userId, courseId))
        )
      ).filter(Boolean);

      if (courseContexts.length === 0) {
        return NextResponse.json({ error: "No mentor context available" }, { status: 404 });
      }

      const primaryCourseId = String(courseContexts[0]?.course_id ?? enrolledCourseIds[0]);
      const result = await callAiApiWithMeta(
        "/v1/mentor/summary",
        {
          user_id: user.userId,
          role: user.role,
          course_id: primaryCourseId,
          context: {
            courses: courseContexts,
          },
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
    }

    const courseContexts = (
      await Promise.all(courseIds.map((courseId) => buildCourseMentorContext(user.userId, courseId)))
    ).filter(Boolean);

    if (courseContexts.length === 0) {
      return NextResponse.json({ error: "No mentor context available" }, { status: 404 });
    }

    const result = await callAiApiWithMeta(
      "/v1/mentor/summary",
      {
        user_id: user.userId,
        role: user.role,
        course_id: String(courseContexts[0]?.course_id ?? courseIds[0]),
        context: {
          courses: courseContexts,
        },
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
