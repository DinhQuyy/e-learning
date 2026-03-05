const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://localhost:8055";
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

type NotificationType = "info" | "success" | "warning" | "enrollment" | "review" | "system";

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
      title: "Duyet ho so giang vien",
      message:
        "Ho so cua ban da duoc duyet. Ban co the dang nhap vao Instructor Portal ngay bay gio.",
      type: "success",
      link: "/instructor/dashboard",
    });
  }

  if (status === "NEEDS_INFO") {
    return createNotification({
      userId,
      title: "Can bo sung ho so giang vien",
      message: adminNote
        ? `Admin yeu cau bo sung: ${adminNote}`
        : "Ho so cua ban can bo sung them thong tin. Vui long cap nhat va gui lai.",
      type: "warning",
      link: "/become-instructor",
    });
  }

  return createNotification({
    userId,
    title: "Ho so giang vien bi tu choi",
    message: adminNote
      ? `Ly do: ${adminNote}`
      : "Ho so cua ban chua du dieu kien duyet.",
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
      title: "Yeu cau kich hoat lai da duoc duyet",
      message:
        "Quyen Instructor da duoc bat lai. Ban co the vao Instructor Portal ngay bay gio.",
      type: "success",
      link: "/instructor/dashboard",
    });
  }

  return createNotification({
    userId,
    title: "Yeu cau kich hoat lai bi tu choi",
    message: adminNote
      ? `Ly do: ${adminNote}`
      : "Admin da tu choi yeu cau kich hoat lai Instructor.",
    type: "warning",
    link: "/become-instructor",
  });
}
