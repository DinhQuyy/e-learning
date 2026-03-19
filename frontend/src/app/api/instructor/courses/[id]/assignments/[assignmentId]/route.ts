import { NextRequest, NextResponse } from "next/server";

import {
  ASSIGNMENT_DETAIL_FIELDS,
  fetchAssignmentById,
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
  currentAssignmentId: string
): Promise<string | null> {
  const params = new URLSearchParams();
  params.set("filter[lesson_id][_eq]", lessonId);
  params.set("filter[status][_eq]", "published");
  params.set("filter[id][_neq]", currentAssignmentId);
  params.set("limit", "1");
  params.set("fields", "id");
  const res = await directusFetch(`/items/assignments?${params.toString()}`);
  if (!res.ok) return "Không thể kiểm tra assignment hiện có cho bài học này.";
  const payload = await res.json().catch(() => null);
  if (Array.isArray(payload?.data) && payload.data.length > 0) {
    return "Mỗi bài học chỉ được có một assignment đang xuất bản trong MVP.";
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
    return await getDirectusError(existingRes, "Không thể tải tiêu chí rubric.");
  }
  const payload = await existingRes.json().catch(() => null);
  const ids = Array.isArray(payload?.data)
    ? payload.data.map((item: { id?: string }) => item.id).filter(Boolean)
    : [];
  for (const id of ids) {
    const deleteRes = await directusFetch(`/items/assignment_rubric_criteria/${encodeURIComponent(String(id))}`, {
      method: "DELETE",
    });
    if (!deleteRes.ok) {
      return await getDirectusError(deleteRes, "Không thể cập nhật rubric criteria.");
    }
  }
  for (let index = 0; index < criteria.length; index += 1) {
    const criterion = criteria[index];
    const createRes = await directusFetch("/items/assignment_rubric_criteria", {
      method: "POST",
      body: JSON.stringify({
        rubric_id: rubricId,
        title: criterion.title,
        description: criterion.description,
        max_points: criterion.max_points,
        scoring_guidance: criterion.scoring_guidance,
        sort: index + 1,
      }),
    });
    if (!createRes.ok) {
      return await getDirectusError(createRes, "Không thể cập nhật rubric criteria.");
    }
  }
  return null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  try {
    const { id: courseId, assignmentId } = await params;
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }
    const isOwner = await verifyInstructorCourseOwnership(userId, courseId);
    if (!isOwner) {
      return NextResponse.json({ error: "Không có quyền truy cập." }, { status: 403 });
    }

    const row = await fetchAssignmentById(assignmentId);
    const normalized = normalizeAssignment(row);
    if (!normalized || normalized.lesson.id === "" || normalized.lesson.id == null) {
      return NextResponse.json({ error: "Không tìm thấy assignment." }, { status: 404 });
    }
    return NextResponse.json({ data: normalized });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể tải assignment." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  try {
    const { id: courseId, assignmentId } = await params;
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }
    const isOwner = await verifyInstructorCourseOwnership(userId, courseId);
    if (!isOwner) {
      return NextResponse.json({ error: "Không có quyền truy cập." }, { status: 403 });
    }

    const existing = await fetchAssignmentById(assignmentId);
    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy assignment." }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const existingRecord = existing as Record<string, unknown>;
    const existingRubric =
      existingRecord.rubric && typeof existingRecord.rubric === "object"
        ? (existingRecord.rubric as Record<string, unknown>)
        : null;
    const lessonId = String(body?.lesson_id ?? getDirectusItemId(existing.lesson_id) ?? "").trim();
    const title = String(body?.title ?? existing.title ?? "").trim();
    const instructions = String(body?.instructions ?? existing.instructions ?? "").trim();
    const status = String(body?.status ?? existing.status ?? "draft").trim();
    const dueAt = body?.due_at !== undefined ? (body?.due_at ? String(body.due_at) : null) : existing.due_at;
    const criteria = normalizeCriteriaInput(body?.criteria ?? existingRubric?.criteria ?? []);
    const maxScore = Number(body?.max_score ?? existing.max_score ?? 0);

    if (!lessonId || !title || !instructions || criteria.length === 0) {
      return NextResponse.json({ error: "Dữ liệu assignment không hợp lệ." }, { status: 400 });
    }

    if (status === "published") {
      const conflict = await ensureNoPublishedConflict(lessonId, assignmentId);
      if (conflict) {
        return NextResponse.json({ error: conflict }, { status: 400 });
      }
    }

    const lessonRes = await directusFetch(
      `/items/lessons/${encodeURIComponent(
        lessonId
      )}?fields=id,module_id.course_id.id`
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

    const updateRes = await directusFetch(`/items/assignments/${encodeURIComponent(assignmentId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        lesson_id: lessonId,
        title,
        instructions,
        due_at: dueAt,
        max_score: Number.isFinite(maxScore) && maxScore > 0 ? maxScore : criteria.reduce((acc, item) => acc + Number(item.max_points || 0), 0),
        status,
      }),
    });
    if (!updateRes.ok) {
      return NextResponse.json(
        { error: await getDirectusError(updateRes, "Không thể cập nhật assignment.") },
        { status: updateRes.status }
      );
    }

    const rubricId = getDirectusItemId(existingRubric);
    if (!rubricId) {
      return NextResponse.json({ error: "Assignment chưa có rubric hợp lệ." }, { status: 500 });
    }
    const criteriaError = await replaceRubricCriteria(rubricId, criteria);
    if (criteriaError) {
      return NextResponse.json({ error: criteriaError }, { status: 500 });
    }

    const finalRes = await directusFetch(
      `/items/assignments/${encodeURIComponent(assignmentId)}?fields=${ASSIGNMENT_DETAIL_FIELDS}`
    );
    if (!finalRes.ok) {
      return NextResponse.json({ data: { id: assignmentId } });
    }
    const finalPayload = await finalRes.json().catch(() => null);
    return NextResponse.json({ data: normalizeAssignment(finalPayload?.data) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể cập nhật assignment." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  try {
    const { id: courseId, assignmentId } = await params;
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }
    const isOwner = await verifyInstructorCourseOwnership(userId, courseId);
    if (!isOwner) {
      return NextResponse.json({ error: "Không có quyền truy cập." }, { status: 403 });
    }

    const res = await directusFetch(`/items/assignments/${encodeURIComponent(assignmentId)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: await getDirectusError(res, "Không thể xoá assignment.") },
        { status: res.status }
      );
    }
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể xoá assignment." },
      { status: 500 }
    );
  }
}
