import { NextRequest, NextResponse } from "next/server";
import { directusFetch, getCurrentUserId } from "@/lib/directus-fetch";
import { notifyInstructorNewReview } from "@/lib/notifications-helper";
import { recalculateCourseRating } from "@/lib/review-rating";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { course_id, rating, comment } = body;

    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    if (!course_id || !rating) {
      return NextResponse.json(
        { error: "Thiếu thông tin đánh giá" },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Đánh giá phải từ 1 đến 5 sao" },
        { status: 400 }
      );
    }

    const courseIdParam = encodeURIComponent(course_id);
    const userIdParam = encodeURIComponent(userId);

    // Verify user is enrolled in the course
    const enrollmentRes = await directusFetch(
      `/items/enrollments?filter[course_id][_eq]=${courseIdParam}&filter[user_id][_eq]=${userIdParam}&limit=1`
    );

    if (enrollmentRes.status === 401) {
      return NextResponse.json(
        { error: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    if (!enrollmentRes.ok) {
      return NextResponse.json(
        { error: "Không thể xác minh đăng ký" },
        { status: 500 }
      );
    }

    const enrollmentData = await enrollmentRes.json();

    if (!enrollmentData.data || enrollmentData.data.length === 0) {
      return NextResponse.json(
        { error: "Bạn cần đăng ký khoá học trước khi đánh giá" },
        { status: 403 }
      );
    }

    // Check if user already reviewed this course
    const existingRes = await directusFetch(
      `/items/reviews?filter[course_id][_eq]=${courseIdParam}&filter[user_id][_eq]=${userIdParam}&limit=1`
    );

    if (existingRes.ok) {
      const existingData = await existingRes.json();
      if (existingData.data && existingData.data.length > 0) {
        return NextResponse.json(
          { error: "Bạn đã đánh giá khoá học này rồi" },
          { status: 409 }
        );
      }
    }

    // Create review
    const createRes = await directusFetch("/items/reviews", {
      method: "POST",
      body: JSON.stringify({
        user_id: userId,
        course_id,
        rating,
        comment: comment || null,
        status: "pending",
      }),
    });

    if (!createRes.ok) {
      const errData = await createRes.json();
      return NextResponse.json(
        {
          error:
            errData.errors?.[0]?.message || "Không thể tạo đánh giá",
        },
        { status: 500 }
      );
    }

    const createData = await createRes.json();

    // Recalculate course average_rating (approved reviews only)
    await recalculateCourseRating(course_id);

    // Notify instructors about new review
    try {
      const meRes = await directusFetch("/users/me?fields=id,first_name,last_name,email");
      const courseInfoRes = await directusFetch(
        `/items/courses/${course_id}?fields=id,title,instructors.user_id`
      );
      if (meRes.ok && courseInfoRes.ok) {
        const meData = await meRes.json();
        const courseInfo = await courseInfoRes.json();
        const student = meData.data;
        const courseData = courseInfo.data;
        const studentName = [student.first_name, student.last_name].filter(Boolean).join(" ") || student.email;
        for (const inst of courseData.instructors ?? []) {
          const instructorId = typeof inst.user_id === "string" ? inst.user_id : inst.user_id?.id;
          if (instructorId) {
            notifyInstructorNewReview(instructorId, studentName, courseData.title, rating, course_id).catch(() => {});
          }
        }
      }
    } catch {
      // Non-critical
    }

    return NextResponse.json({ data: createData.data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
