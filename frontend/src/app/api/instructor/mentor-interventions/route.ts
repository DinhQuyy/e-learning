import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { postAiApiRaw } from "@/lib/ai-client";
import { directusUrl } from "@/lib/directus";
import { directusFetch, getCurrentUserId } from "@/lib/directus-fetch";
import { notifyStudentMentorIntervention } from "@/lib/notifications-helper";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const requestSchema = z.object({
  student_id: z.string().min(1),
  student_name: z.string().trim().min(1).max(120),
  course_id: z.string().min(1),
  course_title: z.string().trim().min(1).max(200),
  course_slug: z.string().trim().optional().nullable(),
  lesson_id: z.string().trim().optional().nullable(),
  recommendation_id: z.string().uuid().optional().nullable(),
  risk_band: z.enum(["low", "medium", "high"]).optional().nullable(),
  recommended_action: z.string().trim().max(500).optional().nullable(),
  action_type: z.enum(["nudge", "micro_plan", "recovery_plan"]),
});

const interventionLogResponseSchema = z.object({
  status: z.literal("ok"),
  intervention_id: z.string().uuid(),
});

type InterventionPayload = z.infer<typeof requestSchema>;

function buildCourseLink(courseSlug: string | null | undefined): {
  relative: string;
  absolute: string;
} {
  const encodedSlug = courseSlug ? encodeURIComponent(courseSlug) : null;
  const relative = encodedSlug
    ? `/continue-learning/${encodedSlug}`
    : "/courses";
  return {
    relative,
    absolute: new URL(relative, APP_URL).toString(),
  };
}

function formatRecommendedAction(action: string | null | undefined): string {
  const value = action?.trim();
  return value && value.length > 0
    ? value
    : "Ưu tiên quay lại bài học tiếp theo để lấy lại nhịp học.";
}

function buildInterventionCopy(payload: InterventionPayload) {
  const courseLink = buildCourseLink(payload.course_slug);
  const recommendedAction = formatRecommendedAction(payload.recommended_action);

  if (payload.action_type === "micro_plan") {
    return {
      notificationTitle: `Kế hoạch 15 phút cho ${payload.course_title}`,
      notificationMessage:
        "Bạn chỉ cần một phiên học ngắn hôm nay để quay lại nhịp học. Mở khóa học và hoàn thành bài tiếp theo ngay bây giờ.",
      emailSubject: `Kế hoạch 15 phút để quay lại khóa học ${payload.course_title}`,
      emailMessage: [
        `Chào ${payload.student_name},`,
        "",
        `Giảng viên vừa gửi cho bạn một kế hoạch học ngắn để quay lại khóa học "${payload.course_title}".`,
        "",
        "Bạn nên làm ngay hôm nay:",
        "1. Mở lại khóa học từ liên kết bên dưới.",
        "2. Dành 15 phút để hoàn thành ít nhất 1 bài học ngắn.",
        "3. Sau khi học xong, đánh dấu hoàn thành để lấy lại đà học tập.",
        "",
        `Gợi ý ưu tiên: ${recommendedAction}`,
        `Mở khóa học: ${courseLink.absolute}`,
      ].join("\n"),
      link: courseLink.relative,
    };
  }

  if (payload.action_type === "recovery_plan") {
    return {
      notificationTitle: `Kế hoạch phục hồi cho ${payload.course_title}`,
      notificationMessage:
        "Bạn đang chậm nhịp ở khóa học này. Hãy quay lại ngay hôm nay và làm theo kế hoạch phục hồi mà giảng viên vừa gửi.",
      emailSubject: `Kế hoạch phục hồi tiến độ cho khóa học ${payload.course_title}`,
      emailMessage: [
        `Chào ${payload.student_name},`,
        "",
        `Giảng viên nhận thấy bạn đang cần lấy lại nhịp học ở khóa "${payload.course_title}".`,
        "",
        "Kế hoạch gợi ý trong 3 ngày tới:",
        "1. Hôm nay: mở lại khóa học và xem tiếp bài gần nhất.",
        "2. Ngày mai: hoàn thành thêm 1 bài học hoặc 1 bài kiểm tra ngắn.",
        "3. Ngày thứ ba: quay lại dashboard để kiểm tra tiến độ và tiếp tục học.",
        "",
        `Gợi ý ưu tiên: ${recommendedAction}`,
        `Mở khóa học: ${courseLink.absolute}`,
      ].join("\n"),
      link: courseLink.relative,
    };
  }

  return {
    notificationTitle: `Giảng viên nhắc bạn quay lại ${payload.course_title}`,
    notificationMessage:
      "Bạn đang tạm ngắt quãng khóa học. Hãy quay lại ngay hôm nay để tiếp tục bài học tiếp theo.",
    emailSubject: `Lời nhắc quay lại khóa học ${payload.course_title}`,
    emailMessage: [
      `Chào ${payload.student_name},`,
      "",
      `Giảng viên vừa gửi lời nhắc để bạn tiếp tục khóa học "${payload.course_title}".`,
      "",
      "Bạn nên làm ngay bây giờ:",
      "1. Mở lại khóa học.",
      "2. Hoàn thành bài học tiếp theo hoặc xem lại phần đang dang dở.",
      "3. Dành ít nhất 10-15 phút để lấy lại nhịp học hôm nay.",
      "",
      `Gợi ý ưu tiên: ${recommendedAction}`,
      `Mở khóa học: ${courseLink.absolute}`,
    ].join("\n"),
    link: courseLink.relative,
  };
}

function resolveChannel(inApp: boolean, email: boolean): "in_app" | "email" | "multi" {
  if (inApp && email) return "multi";
  if (email) return "email";
  return "in_app";
}

async function verifyOwnership(instructorId: string, courseId: string): Promise<boolean> {
  const res = await directusFetch(
    `/items/courses_instructors?filter[course_id][_eq]=${encodeURIComponent(courseId)}&filter[user_id][_eq]=${encodeURIComponent(instructorId)}&limit=1&fields=id`,
    { cache: "no-store" }
  );
  if (!res.ok) return false;
  const data = await res.json().catch(() => null);
  return (data?.data?.length ?? 0) > 0;
}

async function verifyEnrollment(courseId: string, studentId: string): Promise<boolean> {
  const path = `/items/enrollments?filter[course_id][_eq]=${encodeURIComponent(courseId)}&filter[user_id][_eq]=${encodeURIComponent(studentId)}&filter[status][_neq]=cancelled&limit=1&fields=id`;

  let res = await directusFetch(path, { cache: "no-store" });
  if (!res.ok && process.env.DIRECTUS_STATIC_TOKEN) {
    res = await fetch(`${directusUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${process.env.DIRECTUS_STATIC_TOKEN}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
  }

  if (!res.ok) return false;
  const data = await res.json().catch(() => null);
  return (data?.data?.length ?? 0) > 0;
}

export async function POST(request: NextRequest) {
  try {
    const instructorId = await getCurrentUserId();
    if (!instructorId) {
      return NextResponse.json({ error: "Chưa xác thực." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsedBody = requestSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Payload không hợp lệ." }, { status: 400 });
    }

    const payload = parsedBody.data;
    const [ownsCourse, isEnrolled] = await Promise.all([
      verifyOwnership(instructorId, payload.course_id),
      verifyEnrollment(payload.course_id, payload.student_id),
    ]);

    if (!ownsCourse) {
      return NextResponse.json(
        { error: "Bạn không có quyền can thiệp khóa học này." },
        { status: 403 }
      );
    }

    if (!isEnrolled) {
      return NextResponse.json(
        { error: "Học viên không thuộc khóa học này." },
        { status: 404 }
      );
    }

    const copy = buildInterventionCopy(payload);
    const channelResult = await notifyStudentMentorIntervention({
      studentId: payload.student_id,
      instructorId,
      notificationTitle: copy.notificationTitle,
      notificationMessage: copy.notificationMessage,
      emailSubject: copy.emailSubject,
      emailMessage: copy.emailMessage,
      link: copy.link,
    });

    const status = channelResult.inApp || channelResult.email ? "sent" : "failed";
    let interventionId: string | null = null;

    try {
      const raw = await postAiApiRaw("/v1/mentor/interventions/log", {
        instructor_id: instructorId,
        student_id: payload.student_id,
        course_id: payload.course_id,
        lesson_id: payload.lesson_id ?? null,
        recommendation_id: payload.recommendation_id ?? null,
        action_type: payload.action_type,
        channel: resolveChannel(channelResult.inApp, channelResult.email),
        status,
        title: copy.notificationTitle,
        message: copy.notificationMessage,
        metadata: {
          student_name: payload.student_name,
          course_title: payload.course_title,
          course_slug: payload.course_slug ?? null,
          risk_band: payload.risk_band ?? null,
          recommended_action: payload.recommended_action ?? null,
          in_app_sent: channelResult.inApp,
          email_sent: channelResult.email,
          email_recipient: channelResult.emailRecipient ?? null,
          email_original_recipient: channelResult.originalRecipientEmail ?? null,
          email_mode: channelResult.emailMode ?? null,
          email_source: channelResult.emailSource ?? null,
          email_subject: copy.emailSubject,
          email_message: copy.emailMessage,
        },
      });

      const parsedLog = interventionLogResponseSchema.safeParse(raw);
      if (parsedLog.success) {
        interventionId = parsedLog.data.intervention_id;
      }
    } catch {
      // Keep logging best-effort if notification already went out.
    }

    if (status === "failed") {
      return NextResponse.json(
        { error: "Không gửi được thông báo hoặc email cho học viên." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      status: "ok",
      intervention_id: interventionId,
      channels: channelResult,
      notification_title: copy.notificationTitle,
      email_subject: copy.emailSubject,
    });
  } catch (error) {
    console.error("POST instructor mentor intervention error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
  }
}
