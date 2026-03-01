import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readMe } from "@directus/sdk";
import { getDirectusClient } from "./directus";
import type { DirectusUser } from "@/types";

export async function getSession(): Promise<{
  token: string;
  user: DirectusUser;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) return null;

  try {
    const client = getDirectusClient(token);
    const user = await client.request(
      readMe({
        fields: [
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
          "date_created",
        ] as never[],
      })
    );

    return { token, user: user as unknown as DirectusUser };
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<{
  token: string;
  user: DirectusUser;
}> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireRole(
  allowedRoles: string[]
): Promise<{ token: string; user: DirectusUser }> {
  const session = await requireAuth();
  const roleName = getUserRole(session.user);

  if (!allowedRoles.includes(roleName)) {
    redirect("/dashboard");
  }

  return session;
}

export function getUserRole(user: DirectusUser): string {
  const role = user.role;
  if (typeof role === "object" && role?.name) {
    const name = role.name.toLowerCase();
    return name === "administrator" ? "admin" : name;
  }
  return "student";
}

export function getUserDisplayName(user: DirectusUser): string {
  if (user.first_name || user.last_name) {
    return [user.first_name, user.last_name].filter(Boolean).join(" ");
  }
  return user.email;
}
