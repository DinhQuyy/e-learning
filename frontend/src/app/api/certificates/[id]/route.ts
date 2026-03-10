import { NextRequest, NextResponse } from "next/server";
import { directusFetch, getCurrentUserId } from "@/lib/directus-fetch";

function normalizeRelationId(field: unknown): string | null {
  if (!field) return null;
  if (typeof field === "string") return field;
  if (typeof field === "object" && "id" in (field as Record<string, unknown>)) {
    const value = (field as { id?: unknown }).id;
    return typeof value === "string" ? value : null;
  }
  return null;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const certificateRes = await directusFetch(
      `/items/certificates/${encodeURIComponent(id)}?fields=id,user_id,is_deleted`
    );

    if (!certificateRes.ok) {
      return NextResponse.json(
        { error: "Không tìm thấy chứng chỉ" },
        { status: certificateRes.status === 404 ? 404 : 400 }
      );
    }

    const payload = await certificateRes.json().catch(() => null);
    const certificate = payload?.data;
    const ownerId = normalizeRelationId(certificate?.user_id);

    if (!ownerId || ownerId !== userId) {
      return NextResponse.json(
        { error: "Bạn không có quyền xóa chứng chỉ này" },
        { status: 403 }
      );
    }

    if (certificate?.is_deleted === true) {
      return NextResponse.json({ success: true });
    }

    const softDeleteRes = await directusFetch(
      `/items/certificates/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ is_deleted: true }),
      }
    );

    if (!softDeleteRes.ok) {
      const errData = await softDeleteRes.json().catch(() => ({}));
      return NextResponse.json(
        {
          error: errData?.errors?.[0]?.message || "Không thể xóa chứng chỉ",
        },
        { status: softDeleteRes.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
