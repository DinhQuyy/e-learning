import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const DIRECTUS_URL =
  process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://localhost:8055";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refresh_token")?.value;

    // Attempt to invalidate the refresh token in Directus
    if (refreshToken) {
      await fetch(`${DIRECTUS_URL}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      // We intentionally ignore errors here -- the user should be
      // logged out on our side regardless of whether Directus accepted
      // the logout request.
    }

    // Clear all auth cookies
    cookieStore.delete("access_token");
    cookieStore.delete("refresh_token");
    cookieStore.delete("user_role");

    return NextResponse.json({ message: "Logged out successfully." });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
