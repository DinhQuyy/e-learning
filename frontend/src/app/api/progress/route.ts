import { NextRequest, NextResponse } from "next/server";
import { directusFetch } from "@/lib/directus-fetch";

export async function PATCH(request: NextRequest) {
  try {
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
      const totalLessons =
        enrollmentData.data?.course_id?.total_lessons ?? 0;

      if (totalLessons > 0) {
        // Count completed progress records for this enrollment
        const completedRes = await directusFetch(
          `/items/progress?filter[enrollment_id][_eq]=${enrollment_id}&filter[completed][_eq]=true&aggregate[count]=id`
        );

        if (completedRes.ok) {
          const completedData = await completedRes.json();
          const completedCount = completedData.data?.[0]?.count?.id ?? 0;
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
