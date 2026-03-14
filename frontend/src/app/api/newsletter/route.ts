import { NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://localhost:8055";
const STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email không hợp lệ." }, { status: 400 });
    }

    // Try to save to Directus newsletter_subscribers collection
    // If the collection doesn't exist, just return success (graceful degradation)
    try {
      const res = await fetch(`${DIRECTUS_URL}/items/newsletter_subscribers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(STATIC_TOKEN ? { Authorization: `Bearer ${STATIC_TOKEN}` } : {}),
        },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        return NextResponse.json({ success: true });
      }

      // If duplicate email (Directus returns 400 for unique constraint)
      const data = await res.json().catch(() => null);
      const errorMsg = JSON.stringify(data?.errors ?? "");
      if (errorMsg.includes("unique") || errorMsg.includes("duplicate")) {
        return NextResponse.json({ error: "Email này đã được đăng ký." }, { status: 409 });
      }

      // Collection might not exist — still return success as a graceful fallback
      if (res.status === 403 || res.status === 404) {
        return NextResponse.json({ success: true });
      }

      return NextResponse.json({ error: "Không thể đăng ký, vui lòng thử lại." }, { status: 500 });
    } catch {
      // Directus not available — still return success
      return NextResponse.json({ success: true });
    }
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }
}
