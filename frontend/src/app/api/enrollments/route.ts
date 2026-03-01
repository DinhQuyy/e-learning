import { NextRequest, NextResponse } from "next/server";
import { directusFetch, getCurrentUserId } from "@/lib/directus-fetch";
import {
  notifyInstructorNewEnrollment,
  notifyStudentEnrollmentSuccess,
} from "@/lib/notifications-helper";
import { recalculateCourseEnrollments } from "@/lib/enrollment-counter";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { course_id } = body;

    if (!course_id) {
      return NextResponse.json(
        { error: "Thiếu thông tin khoá học" },
        { status: 400 }
      );
    }

    // Get current user ID
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Không xác định được người dùng" },
        { status: 401 }
      );
    }

    // Check if already enrolled
    const checkRes = await directusFetch(
      `/items/enrollments?filter[course_id][_eq]=${course_id}&filter[user_id][_eq]=${userId}&limit=1`
    );

    if (!checkRes.ok) {
      return NextResponse.json(
        { error: "Không thể kiểm tra trạng thái đăng ký" },
        { status: 500 }
      );
    }

    const checkData = await checkRes.json();

    if (checkData.data && checkData.data.length > 0) {
      return NextResponse.json(
        { error: "Bạn đã đăng ký khoá học này rồi", enrollment: checkData.data[0] },
        { status: 409 }
      );
    }

    // Create enrollment
    const createRes = await directusFetch("/items/enrollments", {
      method: "POST",
      body: JSON.stringify({
        user_id: userId,
        course_id,
        status: "active",
        progress_percentage: 0,
        enrolled_at: new Date().toISOString(),
      }),
    });

    if (!createRes.ok) {
      const errData = await createRes.json();
      return NextResponse.json(
        { error: errData.errors?.[0]?.message || "Không thể đăng ký khoá học" },
        { status: 500 }
      );
    }

    const createData = await createRes.json();

    // Send notifications (non-blocking)
    try {
      // Get current user info
      const meRes = await directusFetch("/users/me?fields=id,first_name,last_name,email");
      // Get course info with instructor
      const courseRes = await directusFetch(
        `/items/courses/${course_id}?fields=id,title,slug,instructors.user_id`
      );
      if (meRes.ok && courseRes.ok) {
        const meData = await meRes.json();
        const courseData = await courseRes.json();
        const student = meData.data;
        const course = courseData.data;
        const studentName = [student.first_name, student.last_name].filter(Boolean).join(" ") || student.email;

        // Notify student
        notifyStudentEnrollmentSuccess(student.id, course.title, course.slug).catch(() => {});

        // Notify instructors
        const instructors = course.instructors ?? [];
        for (const inst of instructors) {
          const instructorId = typeof inst.user_id === "string" ? inst.user_id : inst.user_id?.id;
          if (instructorId) {
            notifyInstructorNewEnrollment(instructorId, studentName, course.title, course_id).catch(() => {});
          }
        }
      }
    } catch {
      // Non-critical, ignore
    }

    // Update course total_enrollments with fresh count
    await recalculateCourseEnrollments(course_id);

    return NextResponse.json({ data: createData.data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Lỗi hệ thống" },
      { status: 500 }
    );
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
        { status: 401 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: "Không thể tải danh sách khoá học" },
        { status: 500 }
      );
    }

    const data = await res.json();
    return NextResponse.json({ data: data.data });
  } catch {
    return NextResponse.json(
      { error: "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
