import { directusFetch, getCurrentUserId } from "@/lib/directus-fetch";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const url = `/users/${id}?fields=id,first_name,last_name,email,avatar,status,date_created,bio,phone,headline,social_links,role.id,role.name`;

    const res = await directusFetch(url);

    if (res.status === 401) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: "Không tìm thấy người dùng" },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Also fetch enrollments
    const enrollmentsRes = await directusFetch(
      `/items/enrollments?filter[user_id][_eq]=${id}&fields=id,enrolled_at,status,progress_percentage,course_id.id,course_id.title,course_id.slug&sort=-enrolled_at`
    );

    const enrollments = enrollmentsRes.ok
      ? (await enrollmentsRes.json()).data ?? []
      : [];

    return NextResponse.json({
      data: { ...data.data, enrollments },
    });
  } catch {
    return NextResponse.json(
      { error: "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.role !== undefined) {
      const resolvedRoleId = await resolveRoleId(body.role);

      if (!resolvedRoleId) {
        return NextResponse.json(
          { error: "Vai trò không hợp lệ" },
          { status: 400 }
        );
      }

      updateData.role = resolvedRoleId;
    }

    if (body.status !== undefined) {
      updateData.status = body.status;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Không có dữ liệu cập nhật" },
        { status: 400 }
      );
    }

    const res = await directusFetch(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updateData),
    });

    if (res.status === 401) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 }
      );
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: "Không thể cập nhật người dùng", details: error },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function resolveRoleId(roleValue: unknown): Promise<string | null> {
  // Accept UUID directly
  if (typeof roleValue === "string") {
    const trimmed = roleValue.trim();
    if (trimmed && isUuid(trimmed)) return trimmed;
  }

  // Accept shape { id: "<uuid>" }
  if (
    typeof roleValue === "object" &&
    roleValue !== null &&
    "id" in (roleValue as Record<string, unknown>)
  ) {
    const maybeId = (roleValue as { id?: unknown }).id;
    if (typeof maybeId === "string" && isUuid(maybeId)) return maybeId;
  }

  // Map common slugs/names ("student", "instructor", "admin") to actual IDs
  const targetName =
    typeof roleValue === "string"
      ? roleValue.trim().toLowerCase()
      : undefined;

  if (!targetName) return null;

  const normalized =
    targetName === "admin" || targetName === "administrator"
      ? "administrator"
      : targetName;

  const rolesRes = await directusFetch("/roles?fields=id,name&limit=-1");
  if (!rolesRes.ok) return null;

  const rolesJson = await rolesRes.json().catch(() => null);
  const roles: Array<{ id: string; name?: string }> =
    rolesJson?.data ?? rolesJson ?? [];

  const match = roles.find(
    (r) => r.name && r.name.toLowerCase() === normalized,
  );

  return match?.id ?? null;
}

function extractDirectusMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const maybeErrors = (payload as { errors?: Array<{ message?: unknown }> }).errors;
  const firstMessage = maybeErrors?.[0]?.message;
  return typeof firstMessage === "string" && firstMessage.trim()
    ? firstMessage
    : null;
}

async function nullifyReferences(
  endpoint: string,
  filterQuery: string,
  data: Record<string, null>
) {
  const listRes = await directusFetch(
    `/${endpoint}?fields=id&limit=-1&${filterQuery}`
  );

  if (listRes.status === 404) return;

  if (!listRes.ok) {
    const details = await listRes.json().catch(() => ({}));
    const message =
      extractDirectusMessage(details) ?? `Khong the tai du lieu ${endpoint}`;
    throw new Error(message);
  }

  const listJson = await listRes.json().catch(() => ({}));
  const keys = Array.isArray(listJson?.data)
    ? listJson.data
        .map((item: { id?: unknown }) => item.id)
        .filter((value: unknown): value is string => typeof value === "string")
    : [];

  if (keys.length === 0) return;

  const updateRes = await directusFetch(`/${endpoint}`, {
    method: "PATCH",
    body: JSON.stringify({ keys, data }),
  });

  if (updateRes.status === 404) return;

  if (!updateRes.ok) {
    const details = await updateRes.json().catch(() => ({}));
    const message =
      extractDirectusMessage(details) ?? `Khong the cap nhat ${endpoint}`;
    throw new Error(message);
  }
}

async function prepareUserDeletion(userId: string) {
  const encodedUserId = encodeURIComponent(userId);

  await nullifyReferences(
    "files",
    `filter[_or][0][uploaded_by][_eq]=${encodedUserId}&filter[_or][1][modified_by][_eq]=${encodedUserId}`,
    { uploaded_by: null, modified_by: null }
  );
  await nullifyReferences(
    "notifications",
    `filter[sender][_eq]=${encodedUserId}`,
    { sender: null }
  );
  await nullifyReferences(
    "comments",
    `filter[user_updated][_eq]=${encodedUserId}`,
    { user_updated: null }
  );
  await nullifyReferences(
    "versions",
    `filter[user_updated][_eq]=${encodedUserId}`,
    { user_updated: null }
  );
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const currentUserId = await getCurrentUserId();
    if (currentUserId && currentUserId === id) {
      return NextResponse.json(
        { error: "Không thể tự xoá tài khoản đang đăng nhập" },
        { status: 400 }
      );
    }

    await prepareUserDeletion(id);

    const res = await directusFetch(`/users/${id}`, {
      method: "DELETE",
    });

    if (res.status === 401) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 }
      );
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      const reason = extractDirectusMessage(error);
      return NextResponse.json(
        {
          error: reason
            ? `Khong the xoa nguoi dung: ${reason}`
            : "Không thể xoá người dùng",
          details: error,
        },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message
            ? error.message
            : "Lỗi hệ thống",
      },
      { status: 500 }
    );
  }
}
