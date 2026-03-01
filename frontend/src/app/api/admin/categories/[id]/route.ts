import { NextRequest, NextResponse } from "next/server";
import { directusFetch } from "@/lib/directus-fetch";

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
