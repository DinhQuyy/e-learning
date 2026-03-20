import { NextRequest, NextResponse } from "next/server";
import { directusFetch, getCurrentUserId } from "@/lib/directus-fetch";
import {
  notifyInstructorNewEnrollment,
  notifyStudentEnrollmentSuccess,
} from "@/lib/notifications-helper";
import { recalculateCourseEnrollments } from "@/lib/enrollment-counter";
import { createOrGetEnrollment } from "@/lib/enrollment-integrity";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { course_id } = body;

    if (!course_id) {
      return NextResponse.json(
        { error: "Thiếu thông tin khóa học" },
        { status: 400 }
      );
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Không xác định được người dùng" },
        { status: 401 }
      );
    }

    const enrollmentResult = await createOrGetEnrollment({
      userId,
      courseId: course_id,
    });

    if (!enrollmentResult.created) {
      if (enrollmentResult.duplicatesRemoved > 0) {
        await recalculateCourseEnrollments(course_id);
      }

      return NextResponse.json(
        {
          error: "Bạn đã đăng ký khóa học này rồi",
          enrollment: enrollmentResult.enrollment,
        },
        { status: 409 }
      );
    }

    const createdEnrollment = enrollmentResult.enrollment;

    // Send notifications (non-blocking)
    try {
      const meRes = await directusFetch("/users/me?fields=id,first_name,last_name,email");
      const courseRes = await directusFetch(
        `/items/courses/${course_id}?fields=id,title,slug,instructors.user_id`
      );

      if (meRes.ok && courseRes.ok) {
        const meData = await meRes.json();
        const courseData = await courseRes.json();
        const student = meData.data;
        const course = courseData.data;
        const studentName =
          [student.first_name, student.last_name].filter(Boolean).join(" ") ||
          student.email;

        notifyStudentEnrollmentSuccess(
          student.id,
          course.title,
          course.slug
        ).catch(() => {});

        const instructors = course.instructors ?? [];
        for (const inst of instructors) {
          const instructorId =
            typeof inst.user_id === "string" ? inst.user_id : inst.user_id?.id;
          if (instructorId) {
            notifyInstructorNewEnrollment(
              instructorId,
              studentName,
              course.title,
              course_id
            ).catch(() => {});
          }
        }
      }
    } catch {
      // Non-critical
    }

    if (enrollmentResult.created || enrollmentResult.duplicatesRemoved > 0) {
      await recalculateCourseEnrollments(course_id);
    }

    return NextResponse.json({ data: createdEnrollment }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Lỗi hệ thống";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const res = await directusFetch(
      "/items/enrollments?fields=*,course_id.id,course_id.title,course_id.slug,course_id.thumbnail,course_id.total_lessons,course_id.total_duration,course_id.average_rating,course_id.level,course_id.category_id.name,last_lesson_id.id,last_lesson_id.title,last_lesson_id.slug&sort=-enrolled_at"
    );

    if (res.status === 401) {
      return NextResponse.json(
        { error: "Chưa đăng nhập" },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: "Không thể tải danh sách khóa học" },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }

    const data = await res.json();
    return NextResponse.json(
      { data: data.data },
      { headers: NO_STORE_HEADERS }
    );
  } catch {
    return NextResponse.json(
      { error: "Lỗi hệ thống" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
