import { NextResponse } from "next/server";

const DIRECTUS_URL =
  process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://localhost:8055";

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required." },
        { status: 400 }
      );
    }

    const resetRes = await fetch(`${DIRECTUS_URL}/auth/password/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    if (!resetRes.ok) {
      const errorData = await resetRes.json().catch(() => null);
      const message =
        errorData?.errors?.[0]?.message ||
        "Failed to reset password. The token may be invalid or expired.";
      return NextResponse.json({ error: message }, { status: resetRes.status });
    }

    return NextResponse.json({
      message: "Password has been reset successfully. You can now log in.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
