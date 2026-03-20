import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { CURRENT_USER_FIELDS } from "@/lib/directus-fields";

const DIRECTUS_URL =
  process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://localhost:8055";

const isProduction = process.env.NODE_ENV === "production";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    // Authenticate with Directus
    const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, mode: "json" }),
    });

    if (!loginRes.ok) {
      const errorData = await loginRes.json().catch(() => null);
      const message =
        errorData?.errors?.[0]?.message || "Invalid email or password.";
      return NextResponse.json({ error: message }, { status: loginRes.status });
    }

    const loginData = await loginRes.json();
    const accessToken: string = loginData.data.access_token;
    const refreshToken: string = loginData.data.refresh_token;

    // Fetch user profile to determine role
    const meRes = await fetch(
      `${DIRECTUS_URL}/users/me?fields=${encodeURIComponent(CURRENT_USER_FIELDS)}`,
      {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      }
    );

    if (!meRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch user profile." },
        { status: 500 }
      );
    }

    const meData = await meRes.json();
    const user = meData.data;
    const rawRole: string = user.role?.name?.toLowerCase() || "student";
    // Normalize: Directus default "administrator" → "admin"
    const roleName = rawRole === "administrator" ? "admin" : rawRole;

    // Set cookies
    const cookieStore = await cookies();

    cookieStore.set("access_token", accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 900, // 15 minutes
    });

    cookieStore.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 604800, // 7 days
    });

    cookieStore.set("user_role", roleName, {
      httpOnly: false,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 604800, // 7 days
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: roleName,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
