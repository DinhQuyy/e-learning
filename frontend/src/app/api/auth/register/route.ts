import { NextResponse } from "next/server";
import { z } from "zod";

const DIRECTUS_URL =
  process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://localhost:8055";
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

const registerSchema = z.object({
  email: z.string().email("A valid email address is required."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  first_name: z.string().min(1, "First name is required."),
  last_name: z.string().min(1, "Last name is required."),
  role: z.enum(["student", "instructor"], {
    message: 'Role must be "student" or "instructor".',
  }),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Validation failed.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { email, password, first_name, last_name, role } = parsed.data;

    if (!DIRECTUS_TOKEN) {
      return NextResponse.json(
        { error: "Server configuration error: missing API token." },
        { status: 500 }
      );
    }

    // Look up the Directus role ID by name
    const rolesRes = await fetch(
      `${DIRECTUS_URL}/roles?filter[name][_icontains]=${encodeURIComponent(role)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DIRECTUS_TOKEN}`,
        },
      }
    );

    if (!rolesRes.ok) {
      return NextResponse.json(
        { error: "Failed to look up roles." },
        { status: 500 }
      );
    }

    const rolesData = await rolesRes.json();
    const matchedRole = rolesData.data?.[0];

    if (!matchedRole) {
      return NextResponse.json(
        { error: `Role "${role}" not found in the system.` },
        { status: 400 }
      );
    }

    // Create user in Directus
    const createRes = await fetch(`${DIRECTUS_URL}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DIRECTUS_TOKEN}`,
      },
      body: JSON.stringify({
        email,
        password,
        first_name,
        last_name,
        role: matchedRole.id,
      }),
    });

    if (!createRes.ok) {
      const errorData = await createRes.json().catch(() => null);
      const message =
        errorData?.errors?.[0]?.message || "Failed to create user.";

      // Directus returns 400 for duplicate emails and other validation errors
      const status = createRes.status === 400 ? 400 : createRes.status;
      return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json(
      { message: "Registration successful. You can now log in." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
