import { getMentorDevFallbackRecipient, getMentorInterventionEmailOverride, sendTextEmail } from "@/lib/mail";
import { resolveMentorNotificationRecipient } from "@/lib/mentor-email-preferences";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://localhost:8055";
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

type MentorEmailDeliveryMode =
  | "actual"
  | "override"
  | "dev_fallback"
  | "disabled"
  | "unresolved";

type NotificationType = "info" | "success" | "warning" | "enrollment" | "review" | "system";

function isDemoEmail(email: string | null | undefined): boolean {
  return typeof email === "string" && /@elearning\.dev$/i.test(email);
}

async function sendMentorInterventionEmail({
  studentId,
  subject,
  message,
}: {
  studentId: string;
  subject: string;
  message: string;
}): Promise<{
  sent: boolean;
  recipientEmail: string | null;
  originalRecipientEmail: string | null;
  deliveryMode: MentorEmailDeliveryMode;
  emailSource: "account" | "custom" | "disabled";
}> {
  const resolvedPreference = await resolveMentorNotificationRecipient(studentId);
  const originalRecipientEmail = resolvedPreference.accountEmail;

  if (!resolvedPreference.enabled || !resolvedPreference.recipientEmail) {
    return {
      sent: false,
      recipientEmail: null,
      originalRecipientEmail,
      deliveryMode: "disabled",
      emailSource: "disabled",
    };
  }

  const originalResolvedRecipient = resolvedPreference.recipientEmail;
  const overrideEmail = getMentorInterventionEmailOverride()?.trim() || null;
  const fallbackEmail = getMentorDevFallbackRecipient()?.trim() || null;
  const canUseDevFallback =
    process.env.NODE_ENV !== "production" &&
    (!originalResolvedRecipient || isDemoEmail(originalResolvedRecipient));

  const recipientEmail = overrideEmail
    ? overrideEmail
    : canUseDevFallback
      ? fallbackEmail
      : originalResolvedRecipient;

  const deliveryMode: MentorEmailDeliveryMode = overrideEmail
    ? "override"
    : canUseDevFallback && fallbackEmail
      ? "dev_fallback"
      : recipientEmail
        ? "actual"
        : "unresolved";

  if (!recipientEmail || isDemoEmail(recipientEmail)) {
    return {
      sent: false,
      recipientEmail,
      originalRecipientEmail,
      deliveryMode: "unresolved",
      emailSource: resolvedPreference.source,
    };
  }

  const result = await sendTextEmail({
    to: recipientEmail,
    subject,
    text: message,
  });

  return {
    sent: result.ok,
    recipientEmail,
    originalRecipientEmail,
    deliveryMode,
    emailSource: resolvedPreference.source,
  };
}

export async function createNotification({
  userId,
  title,
  message,
  type = "info",
  link,
}: {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
}) {
  if (!DIRECTUS_TOKEN) {
    console.warn("DIRECTUS_STATIC_TOKEN not set, skipping notification");
    return null;
  }

  try {
    const res = await fetch(`${DIRECTUS_URL}/items/notifications`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DIRECTUS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        title,
        message,
        type,
        is_read: false,
        link: link || null,
      }),
    });

    if (!res.ok) {
      console.error("Failed to create notification:", res.status);
      return null;
    }

    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Notification error:", error);
    return null;
  }
}

export async function createSystemNotification({
  recipientId,
  subject,
  message,
  senderId,
}: {
  recipientId: string;
  subject: string;
  message: string;
  senderId?: string | null;
}) {
  if (!DIRECTUS_TOKEN) {
    console.warn("DIRECTUS_STATIC_TOKEN not set, skipping system notification");
    return null;
  }

  try {
    const res = await fetch(`${DIRECTUS_URL}/notifications`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DIRECTUS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: recipientId,
        sender: senderId || null,
        subject,
        message,
      }),
    });

    if (!res.ok) {
      console.error("Failed to create system notification:", res.status);
      return null;
    }

    const data = await res.json();
    return data.data ?? null;
  } catch (error) {
    console.error("System notification error:", error);
    return null;
  }
}

export async function notifyStudentMentorIntervention({
  studentId,
  instructorId,
  notificationTitle,
  notificationMessage,
  emailSubject,
  emailMessage,
  link,
}: {
  studentId: string;
  instructorId: string;
  notificationTitle: string;
  notificationMessage: string;
  emailSubject: string;
  emailMessage: string;
  link?: string;
}) {
  void instructorId;

  const [inAppResult, emailResult] = await Promise.allSettled([
    createNotification({
      userId: studentId,
      title: notificationTitle,
      message: notificationMessage,
      type: "system",
      link,
    }),
    sendMentorInterventionEmail({
      studentId,
      subject: emailSubject,
      message: emailMessage,
    }),
  ]);

  const resolvedEmailResult =
    emailResult.status === "fulfilled"
      ? emailResult.value
      : {
          sent: false,
          recipientEmail: null,
          originalRecipientEmail: null,
          deliveryMode: "unresolved" as const,
          emailSource: "disabled" as const,
        };

  return {
    inApp:
      inAppResult.status === "fulfilled" && Boolean(inAppResult.value),
    email: resolvedEmailResult.sent,
    emailRecipient: resolvedEmailResult.recipientEmail,
    originalRecipientEmail: resolvedEmailResult.originalRecipientEmail,
    emailMode: resolvedEmailResult.deliveryMode,
    emailSource: resolvedEmailResult.emailSource,
  };
}

export async function notifyInstructorNewEnrollment(
  instructorId: string,
  studentName: string,
  courseTitle: string,
  courseId: string
) {
  return createNotification({
    userId: instructorId,
    title: "Học viên mới đăng ký",
    message: `${studentName} đã đăng ký khoá học "${courseTitle}"`,
    type: "enrollment",
    link: `/instructor/courses/${courseId}/students`,
  });
}

export async function notifyInstructorNewReview(
  instructorId: string,
  studentName: string,
  courseTitle: string,
  rating: number,
  courseId: string
) {
  return createNotification({
    userId: instructorId,
    title: "Đánh giá mới",
    message: `${studentName} đã đánh giá ${rating} sao cho khoá học "${courseTitle}"`,
    type: "review",
    link: `/instructor/courses/${courseId}/reviews`,
  });
}

export async function notifyInstructorCourseStatus(
  instructorId: string,
  courseTitle: string,
  approved: boolean,
  courseId: string
) {
  return createNotification({
    userId: instructorId,
    title: approved ? "Khoá học đã được duyệt" : "Khoá học bị từ chối",
    message: approved
      ? `Khoá học "${courseTitle}" đã được duyệt và xuất bản`
      : `Khoá học "${courseTitle}" đã bị từ chối. Vui lòng kiểm tra và chỉnh sửa.`,
    type: approved ? "success" : "warning",
    link: `/instructor/courses/${courseId}/edit`,
  });
}

export async function notifyStudentEnrollmentSuccess(
  studentId: string,
  courseTitle: string,
  courseSlug: string
) {
  return createNotification({
    userId: studentId,
    title: "Đăng ký thành công",
    message: `Bạn đã đăng ký thành công khoá học "${courseTitle}". Bắt đầu học ngay!`,
    type: "enrollment",
    link: `/learn/${courseSlug}`,
  });
}

export async function notifyInstructorApplicationStatus(
  userId: string,
  status: "APPROVED" | "REJECTED" | "NEEDS_INFO",
  adminNote?: string | null,
) {
  if (status === "APPROVED") {
    return createNotification({
      userId,
      title: "Duyệt hồ sơ giảng viên",
      message:
        "Hồ sơ của bạn đã được duyệt. Bạn có thể đăng nhập vào Instructor Portal ngay bây giờ.",
      type: "success",
      link: "/instructor/dashboard",
    });
  }

  if (status === "NEEDS_INFO") {
    return createNotification({
      userId,
      title: "Cần bổ sung hồ sơ giảng viên",
      message: adminNote
        ? `Admin yêu cầu bổ sung: ${adminNote}`
        : "Hồ sơ của bạn cần bổ sung thêm thông tin. Vui lòng cập nhật và gửi lại.",
      type: "warning",
      link: "/become-instructor",
    });
  }

  return createNotification({
    userId,
    title: "Hồ sơ giảng viên bị từ chối",
    message: adminNote
      ? `Lý do: ${adminNote}`
      : "Hồ sơ của bạn chưa đủ điều kiện duyệt.",
    type: "warning",
    link: "/become-instructor",
  });
}

export async function notifyInstructorReactivationStatus(
  userId: string,
  status: "APPROVED" | "REJECTED",
  adminNote?: string | null,
) {
  if (status === "APPROVED") {
    return createNotification({
      userId,
      title: "Yêu cầu kích hoạt lại đã được duyệt",
      message:
        "Quyền Instructor đã được bật lại. Bạn có thể vào Instructor Portal ngay bây giờ.",
      type: "success",
      link: "/instructor/dashboard",
    });
  }

  return createNotification({
    userId,
    title: "Yêu cầu kích hoạt lại bị từ chối",
    message: adminNote
      ? `Lý do: ${adminNote}`
      : "Admin đã từ chối yêu cầu kích hoạt lại Instructor.",
    type: "warning",
    link: "/become-instructor",
  });
}
