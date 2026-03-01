import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const DIRECTUS_URL =
  process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://localhost:8055";

const isProduction = process.env.NODE_ENV === "production";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refresh_token")?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "No refresh token found." },
        { status: 401 }
      );
    }

    const refreshRes = await fetch(`${DIRECTUS_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refresh_token: refreshToken,
        mode: "json",
      }),
    });

    if (!refreshRes.ok) {
      // If the refresh fails, clear stale cookies so the client
      // knows the session is truly expired.
      cookieStore.delete("access_token");
      cookieStore.delete("refresh_token");
      cookieStore.delete("user_role");

      return NextResponse.json(
        { error: "Session expired. Please log in again." },
        { status: 401 }
      );
    }

    const refreshData = await refreshRes.json();
    const newAccessToken: string = refreshData.data.access_token;
    const newRefreshToken: string = refreshData.data.refresh_token;

    cookieStore.set("access_token", newAccessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 900, // 15 minutes
    });

    cookieStore.set("refresh_token", newRefreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 604800, // 7 days
    });

    // Refresh user_role cookie
    try {
      const meRes = await fetch(
        `${DIRECTUS_URL}/users/me?fields=role.name`,
        { headers: { Authorization: `Bearer ${newAccessToken}` } },
      );
      if (meRes.ok) {
        const meData = await meRes.json();
        const rawRole: string =
          meData.data?.role?.name?.toLowerCase() || "student";
        const roleName = rawRole === "administrator" ? "admin" : rawRole;
        cookieStore.set("user_role", roleName, {
          httpOnly: false,
          secure: isProduction,
          sameSite: "lax",
          path: "/",
          maxAge: 604800, // 7 days
        });
      }
    } catch {
      // Non-critical — role cookie refresh failed but tokens are valid
    }

    return NextResponse.json({ message: "Token refreshed successfully." });
  } catch (error) {
    console.error("Refresh error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
