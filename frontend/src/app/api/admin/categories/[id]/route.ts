import { NextRequest, NextResponse } from "next/server";
import { directusFetch } from "@/lib/directus-fetch";
import { isValidSlug, isValidCategoryStatus } from "@/lib/validations";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    const allowedFields = [
      "name",
      "slug",
      "description",
      "icon",
      "parent_id",
      "status",
      "sort",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (updateData.slug && !isValidSlug(updateData.slug as string)) {
      return NextResponse.json(
        { error: "Slug không hợp lệ. Chỉ chấp nhận chữ thường, số và dấu gạch ngang" },
        { status: 400 }
      );
    }

    // Check slug uniqueness (exclude current category)
    if (updateData.slug) {
      const slugCheck = await directusFetch(
        `/items/categories?filter[slug][_eq]=${encodeURIComponent(updateData.slug as string)}&filter[id][_neq]=${id}&limit=1&fields=id`
      );
      if (slugCheck.ok) {
        const slugData = await slugCheck.json();
        if ((slugData.data ?? []).length > 0) {
          return NextResponse.json(
            { error: "Slug đã tồn tại. Vui lòng chọn slug khác" },
            { status: 409 }
          );
        }
      }
    }

    if (updateData.status && !isValidCategoryStatus(updateData.status as string)) {
      return NextResponse.json(
        { error: "Trạng thái không hợp lệ. Chỉ chấp nhận: published, draft, archived" },
        { status: 400 }
      );
    }

    // Validate parent_id: prevent self-reference and circular loops
    if (updateData.parent_id !== undefined && updateData.parent_id !== null) {
      const parentId = String(updateData.parent_id);
      if (parentId === id) {
        return NextResponse.json(
          { error: "Danh mục không thể là danh mục cha của chính nó" },
          { status: 400 }
        );
      }
      // Walk up the parent chain to detect circular reference
      let currentParentId: string | null = parentId;
      const visited = new Set<string>([id]);
      while (currentParentId) {
        if (visited.has(currentParentId)) {
          return NextResponse.json(
            { error: "Phát hiện vòng lặp danh mục cha. Vui lòng chọn danh mục cha khác" },
            { status: 400 }
          );
        }
        visited.add(currentParentId);
        const parentRes = await directusFetch(
          `/items/categories/${currentParentId}?fields=parent_id`
        );
        if (!parentRes.ok) break;
        const parentData = await parentRes.json();
        const raw = parentData.data?.parent_id;
        currentParentId = raw
          ? String(typeof raw === "object" ? raw.id : raw)
          : null;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Không có dữ liệu cập nhật" },
        { status: 400 }
      );
    }

    const res = await directusFetch(`/items/categories/${id}`, {
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
        { error: "Không thể cập nhật danh mục", details: error },
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Check if any courses are assigned to this category
    const checkRes = await directusFetch(
      `/items/courses?filter[category_id][_eq]=${id}&aggregate[count]=id`
    );

    if (checkRes.ok) {
      const checkData = await checkRes.json();
      const courseCount = Number(checkData.data?.[0]?.count?.id ?? 0);
      if (courseCount > 0) {
        return NextResponse.json(
          {
            error: `Không thể xoá danh mục này vì có ${courseCount} khoá học đang sử dụng`,
          },
          { status: 400 }
        );
      }
    }

    // Check for child categories
    const childCheckRes = await directusFetch(
      `/items/categories?filter[parent_id][_eq]=${id}&aggregate[count]=id`
    );

    if (childCheckRes.ok) {
      const childData = await childCheckRes.json();
      const childCount = Number(childData.data?.[0]?.count?.id ?? 0);
      if (childCount > 0) {
        return NextResponse.json(
          {
            error: `Không thể xoá danh mục này vì có ${childCount} danh mục con`,
          },
          { status: 400 }
        );
      }
    }

    if (checkRes.status === 401) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 }
      );
    }

    const res = await directusFetch(`/items/categories/${id}`, {
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
      return NextResponse.json(
        { error: "Không thể xoá danh mục", details: error },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
