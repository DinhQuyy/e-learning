import { NextRequest, NextResponse } from "next/server";
import { directusFetch } from "@/lib/directus-fetch";

export async function GET() {
  try {
    const res = await directusFetch("/items/platform_settings?limit=1");

    if (res.status === 401) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 }
      );
    }

    if (!res.ok) {
      // Collection might not exist yet, return defaults
      return NextResponse.json({
        data: {
          platform_name: "E-Learning Platform",
          platform_description: "Nền tảng học trực tuyến hàng đầu Việt Nam",
          maintenance_mode: false,
          maintenance_message: "Hệ thống đang bảo trì. Vui lòng quay lại sau.",
        },
      });
    }

    const data = await res.json();
    // Singleton pattern: return first item or defaults
    const settings = data.data?.[0] ?? data.data ?? {
      platform_name: "E-Learning Platform",
      platform_description: "Nền tảng học trực tuyến hàng đầu Việt Nam",
      maintenance_mode: false,
      maintenance_message: "Hệ thống đang bảo trì. Vui lòng quay lại sau.",
    };
    return NextResponse.json({ data: settings });
  } catch {
    return NextResponse.json({
      data: {
        platform_name: "E-Learning Platform",
        platform_description: "Nền tảng học trực tuyến hàng đầu Việt Nam",
        maintenance_mode: false,
        maintenance_message: "Hệ thống đang bảo trì. Vui lòng quay lại sau.",
      },
    });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    // Try to get existing settings
    const getRes = await directusFetch("/items/platform_settings?limit=1");

    if (getRes.status === 401) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 }
      );
    }

    let method = "POST";
    let url = "/items/platform_settings";

    if (getRes.ok) {
      const existing = await getRes.json();
      const firstItem = existing.data?.[0];
      if (firstItem?.id) {
        method = "PATCH";
        url = `/items/platform_settings/${firstItem.id}`;
      }
    }

    const res = await directusFetch(url, {
      method,
      body: JSON.stringify({
        platform_name: body.platform_name,
        platform_description: body.platform_description,
        maintenance_mode: body.maintenance_mode,
        maintenance_message: body.maintenance_message,
      }),
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
        { error: "Không thể lưu cài đặt", details: error },
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
