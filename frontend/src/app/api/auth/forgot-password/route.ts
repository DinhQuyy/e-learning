import { NextResponse } from "next/server";

const DIRECTUS_URL =
  process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://localhost:8055";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    // Call Directus password reset request
    // We fire-and-forget and always return success to avoid leaking
    // whether an email exists in the system.
    await fetch(`${DIRECTUS_URL}/auth/password/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        reset_url: `${APP_URL}/reset-password`,
      }),
    });

    return NextResponse.json({
      message:
        "If an account with that email exists, a password reset link has been sent. Please check your inbox.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    // Still return a success-like response to avoid information leakage
    return NextResponse.json({
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  }
}
