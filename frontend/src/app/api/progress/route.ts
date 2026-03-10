import { NextRequest, NextResponse } from "next/server";
import { directusFetch, getCurrentUserId } from "@/lib/directus-fetch";
import { directusUrl } from "@/lib/directus";
import { sendLearningEventSafe } from "@/lib/ai-events";

function normalizePositiveNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function normalizeRelationId(value: unknown): string {
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

function buildCertificateCode(enrollmentId: string): string {
  const compactEnrollmentId = enrollmentId.replace(/-/g, "").toUpperCase();
  return `EL-${compactEnrollmentId}`;
}

async function createCertificateWithServerToken(payload: {
  user_id: string;
  course_id: string;
  enrollment_id: string;
  certificate_code: string;
}): Promise<boolean> {
  const serviceToken = process.env.DIRECTUS_STATIC_TOKEN;
  if (!serviceToken) return false;

  const res = await fetch(`${directusUrl}/items/certificates`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  }).catch(() => null);

  return !!res && res.ok;
}

async function issueCertificateIfMissing(enrollmentId: string): Promise<void> {
  const encodedEnrollmentId = encodeURIComponent(enrollmentId);

  const existingRes = await directusFetch(
    `/items/certificates?filter[enrollment_id][_eq]=${encodedEnrollmentId}&fields=id&limit=1`
  );
  if (existingRes.ok) {
    const existingData = await existingRes.json().catch(() => null);
    if (Array.isArray(existingData?.data) && existingData.data.length > 0) return;
  }

  const enrollmentRes = await directusFetch(
    `/items/enrollments/${encodedEnrollmentId}?fields=id,user_id.id,user_id,course_id.id,course_id`
  );
  if (!enrollmentRes.ok) return;

  const enrollmentData = await enrollmentRes.json().catch(() => null);
  const enrollmentRow = enrollmentData?.data;
  const userId = normalizeRelationId(enrollmentRow?.user_id);
  const courseId = normalizeRelationId(enrollmentRow?.course_id);
  if (!userId || !courseId) return;

  const payload = {
    user_id: userId,
    course_id: courseId,
    enrollment_id: enrollmentId,
    certificate_code: buildCertificateCode(enrollmentId),
  };

  const createRes = await directusFetch("/items/certificates", {
    method: "POST",
    body: JSON.stringify(payload),
  }).catch(() => null);

  if (
    createRes &&
    !createRes.ok &&
    (createRes.status === 401 || createRes.status === 403)
  ) {
    await createCertificateWithServerToken(payload).catch(() => {});
  }
}

async function getPublishedLessonCountByCourse(courseId: string): Promise<number | null> {
  const query = `/items/modules?filter[course_id][_eq]=${encodeURIComponent(courseId)}&fields=course_id,lessons.id&deep[lessons][_filter][status][_eq]=published&limit=-1`;
  const serviceToken = process.env.DIRECTUS_STATIC_TOKEN;

  let res: Response;
  if (serviceToken) {
    res = await fetch(`${directusUrl}${query}`, {
      headers: {
        Authorization: `Bearer ${serviceToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
  } else {
    res = await directusFetch(query);
  }

  if (!res.ok) return null;

  const payload = await res.json().catch(() => null);
  const modules = Array.isArray(payload?.data) ? payload.data : [];
  let total = 0;

  for (const moduleRow of modules) {
    const lessons = Array.isArray(moduleRow?.lessons) ? moduleRow.lessons : [];
    total += lessons.length;
  }

  return total;
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { enrollment_id, lesson_id, completed, video_position } = body;

    if (!enrollment_id || !lesson_id) {
      return NextResponse.json(
        { error: "Thiếu thông tin bắt buộc" },
        { status: 400 }
      );
    }

    // Check if progress record already exists
    const checkRes = await directusFetch(
      `/items/progress?filter[enrollment_id][_eq]=${enrollment_id}&filter[lesson_id][_eq]=${lesson_id}&limit=1`
    );

    if (checkRes.status === 401) {
      return NextResponse.json(
        { error: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    if (!checkRes.ok) {
      return NextResponse.json(
        { error: "Không thể kiểm tra tiến độ" },
        { status: 500 }
      );
    }

    const checkData = await checkRes.json();
    const existingProgress = checkData.data?.[0];

    const progressPayload: Record<string, unknown> = {};

    if (typeof completed === "boolean") {
      progressPayload.completed = completed;
      if (completed) {
        progressPayload.completed_at = new Date().toISOString();
      }
    }

    if (typeof video_position === "number") {
      progressPayload.video_position = video_position;
    }

    let progressRecord;

    if (existingProgress) {
      // Update existing progress
      const updateRes = await directusFetch(
        `/items/progress/${existingProgress.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(progressPayload),
        }
      );

      if (!updateRes.ok) {
        return NextResponse.json(
          { error: "Không thể cập nhật tiến độ" },
          { status: 500 }
        );
      }

      const updateData = await updateRes.json();
      progressRecord = updateData.data;
    } else {
      // Create new progress record
      const createRes = await directusFetch("/items/progress", {
        method: "POST",
        body: JSON.stringify({
          enrollment_id,
          lesson_id,
          completed: completed ?? false,
          video_position: video_position ?? 0,
          completed_at: completed ? new Date().toISOString() : null,
        }),
      });

      if (!createRes.ok) {
        const errData = await createRes.json();
        return NextResponse.json(
          { error: errData.errors?.[0]?.message || "Không thể tạo tiến độ" },
          { status: 500 }
        );
      }

      const createData = await createRes.json();
      progressRecord = createData.data;
    }

    // Update last accessed lesson on enrollment
    await directusFetch(`/items/enrollments/${enrollment_id}`, {
      method: "PATCH",
      body: JSON.stringify({
        last_lesson_id: lesson_id,
      }),
    }).catch(() => {});

    // Recalculate enrollment progress_percentage
    // Get total lessons for the course from the enrollment
    const enrollmentRes = await directusFetch(
      `/items/enrollments/${enrollment_id}?fields=course_id.total_lessons,course_id.id`
    );

    if (enrollmentRes.ok) {
      const enrollmentData = await enrollmentRes.json();
      const courseIdRaw = enrollmentData.data?.course_id?.id;
      const courseId = courseIdRaw ? String(courseIdRaw) : "";
      const storedTotalLessons = normalizePositiveNumber(
        enrollmentData.data?.course_id?.total_lessons
      );
      const countedTotalLessons = courseId
        ? await getPublishedLessonCountByCourse(courseId)
        : null;
      const totalLessons =
        countedTotalLessons !== null
          ? normalizePositiveNumber(countedTotalLessons)
          : storedTotalLessons;

      if (totalLessons > 0) {
        // Count completed progress records for this enrollment
        const completedRes = await directusFetch(
          `/items/progress?filter[enrollment_id][_eq]=${enrollment_id}&filter[completed][_eq]=true&aggregate[count]=id`
        );

        if (completedRes.ok) {
          const completedData = await completedRes.json();
          const completedCount = Number(completedData.data?.[0]?.count?.id ?? 0);
          const progressPercentage = Math.round(
            (completedCount / totalLessons) * 100
          );

          const enrollmentUpdate: Record<string, unknown> = {
            progress_percentage: Math.min(progressPercentage, 100),
          };

          if (progressPercentage >= 100) {
            enrollmentUpdate.status = "completed";
            enrollmentUpdate.completed_at = new Date().toISOString();
          } else {
            // Move back to active if user unchecks completion
            enrollmentUpdate.status = "active";
            enrollmentUpdate.completed_at = null;
          }

          await directusFetch(
            `/items/enrollments/${enrollment_id}`,
            {
              method: "PATCH",
              body: JSON.stringify(enrollmentUpdate),
            }
          ).catch(() => {});

          if (progressPercentage >= 100) {
            await issueCertificateIfMissing(String(enrollment_id)).catch(() => {});
          }
        }
      }

      if (courseId) {
        if (!existingProgress) {
          await sendLearningEventSafe({
            user_id: userId,
            course_id: courseId,
            lesson_id,
            event_type: "lesson_start",
            duration_sec: 0,
            metadata: {},
          });
        }

        if (typeof completed === "boolean" && completed) {
          await sendLearningEventSafe({
            user_id: userId,
            course_id: courseId,
            lesson_id,
            event_type: "lesson_complete",
            duration_sec: 0,
            metadata: {},
          });
        }

        if (typeof video_position === "number" && video_position > 0) {
          await sendLearningEventSafe({
            user_id: userId,
            course_id: courseId,
            lesson_id,
            event_type: "video_watch",
            duration_sec: Math.floor(video_position),
            metadata: {},
          });
        }
      }
    }

    return NextResponse.json({ data: progressRecord });
  } catch {
    return NextResponse.json(
      { error: "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
