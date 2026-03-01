import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { directusFetch, getDirectusError } from "@/lib/directus-fetch";

const DIRECTUS_URL =
  process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://localhost:8055";
const isProduction = process.env.NODE_ENV === "production";

const COOKIE_OPTIONS_ACCESS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 900, // 15 minutes
};

const COOKIE_OPTIONS_REFRESH = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 604800, // 7 days
};

const COOKIE_OPTIONS_ROLE = {
  httpOnly: false,
  secure: isProduction,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 604800, // 7 days
};

export async function PATCH(request: Request) {
  try {
    const { current_password, new_password } = await request.json();

    if (!current_password || !new_password) {
      return NextResponse.json(
        { error: "Thiếu mật khẩu hiện tại hoặc mật khẩu mới." },
        { status: 400 },
      );
    }

    if (typeof new_password !== "string" || new_password.length < 8) {
      return NextResponse.json(
        { error: "Mật khẩu mới phải có ít nhất 8 ký tự." },
        { status: 400 },
      );
    }

    const meRes = await directusFetch("/users/me?fields=id,email,role.name");

    if (meRes.status === 401) {
      return NextResponse.json(
        { error: "Bạn cần đăng nhập để thực hiện thao tác này." },
        { status: 401 },
      );
    }

    if (!meRes.ok) {
      const message = await getDirectusError(
        meRes,
        "Không lấy được thông tin người dùng.",
      );
      return NextResponse.json({ error: message }, { status: meRes.status });
    }

    const meData = await meRes.json();
    const userId: string | undefined = meData?.data?.id;
    const email: string | undefined = meData?.data?.email;
    const rawRole: string =
      meData?.data?.role?.name?.toLowerCase() || "student";
    const roleName = rawRole === "administrator" ? "admin" : rawRole;

    if (!userId || !email) {
      return NextResponse.json(
        { error: "Thiếu thông tin người dùng để đổi mật khẩu." },
        { status: 400 },
      );
    }

    // Xác thực lại mật khẩu hiện tại
    const verifyRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: current_password,
        mode: "json",
      }),
    });

    if (!verifyRes.ok) {
      return NextResponse.json(
        { error: "Mật khẩu hiện tại không đúng." },
        { status: 400 },
      );
    }

    // Lấy token đặc quyền để bypass hạn chế trường password
    let privilegedToken = process.env.DIRECTUS_STATIC_TOKEN;

    // Fallback: đăng nhập admin nếu không có static token
    if (!privilegedToken) {
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;

      if (adminEmail && adminPassword) {
        const adminLoginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: adminEmail,
            password: adminPassword,
            mode: "json",
          }),
        });

        if (adminLoginRes.ok) {
          const adminData = await adminLoginRes.json();
          privilegedToken = adminData?.data?.access_token;
        }
      }
    }

    if (!privilegedToken) {
      return NextResponse.json(
        {
          error:
            "Thiếu quyền cập nhật mật khẩu. Vui lòng cấu hình DIRECTUS_STATIC_TOKEN hoặc ADMIN_EMAIL/ADMIN_PASSWORD.",
        },
        { status: 500 },
      );
    }

    // Cập nhật mật khẩu bằng token đặc quyền
    const updateRes = await fetch(`${DIRECTUS_URL}/users/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${privilegedToken}`,
      },
      body: JSON.stringify({ password: new_password }),
    });

    if (!updateRes.ok) {
      const message = await getDirectusError(
        updateRes,
        "Không thể đổi mật khẩu.",
      );
      return NextResponse.json({ error: message }, { status: updateRes.status });
    }

    // Đăng nhập lại để phát hành token mới sau khi đổi mật khẩu
    const reloginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: new_password,
        mode: "json",
      }),
    });

    if (reloginRes.ok) {
      const reloginData = await reloginRes.json();
      const accessToken: string | undefined = reloginData?.data?.access_token;
      const refreshToken: string | undefined = reloginData?.data?.refresh_token;

      if (accessToken && refreshToken) {
        const cookieStore = await cookies();
        cookieStore.set("access_token", accessToken, COOKIE_OPTIONS_ACCESS);
        cookieStore.set("refresh_token", refreshToken, COOKIE_OPTIONS_REFRESH);
        cookieStore.set("user_role", roleName, COOKIE_OPTIONS_ROLE);
      }
    }

    return NextResponse.json({
      message: "Đổi mật khẩu thành công.",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra, vui lòng thử lại." },
      { status: 500 },
    );
  }
}
