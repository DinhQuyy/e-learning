import { NextResponse } from "next/server";
import { directusFetch } from "@/lib/directus-fetch";
import { cookies } from "next/headers";

const isProduction = process.env.NODE_ENV === "production";

export async function GET() {
  try {
    const fields = [
      "id",
      "first_name",
      "last_name",
      "email",
      "avatar",
      "role.id",
      "role.name",
      "status",
      "bio",
      "phone",
      "headline",
      "social_links",
    ].join(",");

    const meRes = await directusFetch(`/users/me?fields=${fields}`);

    if (meRes.status === 401) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    if (!meRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch user profile." },
        { status: meRes.status }
      );
    }

    const meData = await meRes.json();
    const rawRole: string = meData.data?.role?.name?.toLowerCase() || "student";
    const roleName = rawRole === "administrator" ? "admin" : rawRole;

    const cookieStore = await cookies();
    cookieStore.set("user_role", roleName, {
      httpOnly: false,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 604800,
    });

    return NextResponse.json({ user: meData.data });
  } catch (error) {
    console.error("Fetch user error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    const updateRes = await directusFetch(`/users/me`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });

    if (updateRes.status === 401) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    if (!updateRes.ok) {
      const errorText = await updateRes.text();
      console.error("Update profile failed:", updateRes.status, errorText);
      return NextResponse.json(
        { error: "Failed to update profile." },
        { status: updateRes.status }
      );
    }

    const updateData = await updateRes.json();

    return NextResponse.json({ user: updateData.data });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
