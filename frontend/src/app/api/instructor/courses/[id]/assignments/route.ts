import { NextRequest, NextResponse } from "next/server";

import {
  ASSIGNMENT_LIST_FIELDS,
  fetchAssignmentListForCourse,
  getDirectusItemId,
  verifyInstructorCourseOwnership,
} from "@/lib/assignment-route-utils";
import { normalizeAssignment } from "@/lib/assignment-presenters";
import { directusFetch, getCurrentUserId, getDirectusError } from "@/lib/directus-fetch";

type CriterionInput = {
  title: string;
  description: string | null;
  max_points: number;
  scoring_guidance: string | null;
};

async function ensureNoPublishedConflict(
  lessonId: string,
  currentAssignmentId?: string
): Promise<string | null> {
  const params = new URLSearchParams();
  params.set("filter[lesson_id][_eq]", lessonId);
  params.set("filter[status][_eq]", "published");
  if (currentAssignmentId) {
    params.set("filter[id][_neq]", currentAssignmentId);
  }
  params.set("limit", "1");
  params.set("fields", "id,title");

  const res = await directusFetch(`/items/assignments?${params.toString()}`);
  if (!res.ok) return "Không thể kiểm tra assignment hiện có cho bài học này.";
  const payload = await res.json().catch(() => null);
  if (Array.isArray(payload?.data) && payload.data.length > 0) {
    return "Mỗi bài học chỉ được có một assignment đang xuất bản trong MVP.";
  }
  return null;
}

async function replaceRubricCriteria(
  rubricId: string,
  criteria: CriterionInput[]
): Promise<string | null> {
  const existingRes = await directusFetch(
    `/items/assignment_rubric_criteria?filter[rubric_id][_eq]=${encodeURIComponent(
      rubricId
    )}&fields=id&limit=-1`
  );
  if (!existingRes.ok) {
    return await getDirectusError(existingRes, "Không thể tải tiêu chí rubric hiện có.");
  }
  const existingPayload = await existingRes.json().catch(() => null);
  const existingIds = Array.isArray(existingPayload?.data)
    ? existingPayload.data.map((item: { id?: string }) => item.id).filter(Boolean)
    : [];

  for (const id of existingIds) {
    const deleteRes = await directusFetch(`/items/assignment_rubric_criteria/${encodeURIComponent(String(id))}`, {
      method: "DELETE",
    });
    if (!deleteRes.ok) {
      return await getDirectusError(deleteRes, "Không thể xoá tiêu chí rubric cũ.");
    }
  }

  for (let index = 0; index < criteria.length; index += 1) {
    const criterion = criteria[index];
    const createRes = await directusFetch("/items/assignment_rubric_criteria", {
      method: "POST",
      body: JSON.stringify({
        rubric_id: rubricId,
        title: String(criterion.title ?? "").trim(),
        description: criterion.description ? String(criterion.description) : null,
        max_points: Number(criterion.max_points ?? 0),
        scoring_guidance: criterion.scoring_guidance ? String(criterion.scoring_guidance) : null,
        sort: index + 1,
      }),
    });
    if (!createRes.ok) {
      return await getDirectusError(createRes, "Không thể lưu tiêu chí rubric.");
    }
  }

  return null;
}

function normalizeCriteriaInput(rawCriteria: unknown): CriterionInput[] {
  if (!Array.isArray(rawCriteria)) return [];
  return rawCriteria
    .map((criterion) => {
      const row = criterion as CriterionInput;
      const title = String(row?.title ?? "").trim();
      const maxPoints = Number(row?.max_points ?? 0);
      if (!title || !Number.isFinite(maxPoints) || maxPoints <= 0) {
        return null;
      }
      return {
        title,
        description: row?.description ? String(row.description) : null,
        max_points: maxPoints,
        scoring_guidance: row?.scoring_guidance ? String(row.scoring_guidance) : null,
      };
    })
    .filter((criterion): criterion is CriterionInput => criterion !== null);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const isOwner = await verifyInstructorCourseOwnership(userId, courseId);
    if (!isOwner) {
      return NextResponse.json({ error: "Không có quyền truy cập." }, { status: 403 });
    }

    const rows = await fetchAssignmentListForCourse(courseId);
    const data = rows.map(normalizeAssignment).filter(Boolean);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể tải assignment." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const isOwner = await verifyInstructorCourseOwnership(userId, courseId);
    if (!isOwner) {
      return NextResponse.json({ error: "Không có quyền truy cập." }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const lessonId = String(body?.lesson_id ?? "").trim();
    const title = String(body?.title ?? "").trim();
    const instructions = String(body?.instructions ?? "").trim();
    const status = String(body?.status ?? "draft").trim();
    const maxScore = Number(body?.max_score ?? 0);
    const dueAt = body?.due_at ? String(body.due_at) : null;
    const criteria = normalizeCriteriaInput(body?.criteria);

    if (!lessonId || !title || !instructions || criteria.length === 0) {
      return NextResponse.json(
        { error: "Thiếu lesson, tiêu đề, hướng dẫn hoặc rubric criteria hợp lệ." },
        { status: 400 }
      );
    }

    const lessonRes = await directusFetch(
      `/items/lessons/${encodeURIComponent(
        lessonId
      )}?fields=id,module_id.course_id.id,module_id.course_id.title`
    );
    if (!lessonRes.ok) {
      return NextResponse.json({ error: "Không tìm thấy bài học." }, { status: 404 });
    }
    const lessonPayload = await lessonRes.json().catch(() => null);
    const lessonCourseId = getDirectusItemId(lessonPayload?.data?.module_id?.course_id);
    if (lessonCourseId !== courseId) {
      return NextResponse.json(
        { error: "Bài học không thuộc khóa học hiện tại." },
        { status: 400 }
      );
    }

    if (status === "published") {
      const conflict = await ensureNoPublishedConflict(lessonId);
      if (conflict) {
        return NextResponse.json({ error: conflict }, { status: 400 });
      }
    }

    const assignmentRes = await directusFetch("/items/assignments", {
      method: "POST",
      body: JSON.stringify({
        lesson_id: lessonId,
        title,
        instructions,
        due_at: dueAt,
        max_score: Number.isFinite(maxScore) && maxScore > 0 ? maxScore : criteria.reduce((acc, item) => acc + Number(item.max_points || 0), 0),
        status,
      }),
    });
    if (!assignmentRes.ok) {
      return NextResponse.json(
        { error: await getDirectusError(assignmentRes, "Không thể tạo assignment.") },
        { status: assignmentRes.status }
      );
    }
    const assignmentPayload = await assignmentRes.json().catch(() => null);
    const assignmentId = String(assignmentPayload?.data?.id ?? "");

    const rubricRes = await directusFetch("/items/assignment_rubrics", {
      method: "POST",
      body: JSON.stringify({
        assignment_id: assignmentId,
        title: "Rubric",
      }),
    });
    if (!rubricRes.ok) {
      return NextResponse.json(
        { error: await getDirectusError(rubricRes, "Không thể tạo rubric.") },
        { status: rubricRes.status }
      );
    }
    const rubricPayload = await rubricRes.json().catch(() => null);
    const rubricId = String(rubricPayload?.data?.id ?? "");

    const criteriaError = await replaceRubricCriteria(rubricId, criteria);
    if (criteriaError) {
      return NextResponse.json({ error: criteriaError }, { status: 500 });
    }

    const finalRes = await directusFetch(
      `/items/assignments/${encodeURIComponent(assignmentId)}?fields=${ASSIGNMENT_LIST_FIELDS}`
    );
    if (!finalRes.ok) {
      return NextResponse.json({ data: { id: assignmentId } }, { status: 201 });
    }
    const finalPayload = await finalRes.json().catch(() => null);
    const normalized = normalizeAssignment(finalPayload?.data);
    return NextResponse.json({ data: normalized }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể tạo assignment." },
      { status: 500 }
    );
  }
}
