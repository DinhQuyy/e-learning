import type { DirectusUser } from "@/types";

export type AppRole = "admin" | "instructor" | "student";

function normalizeRoleName(raw: string | null | undefined): AppRole {
  const value = (raw ?? "").toLowerCase().trim();
  if (value === "admin" || value === "administrator") return "admin";
  if (value === "instructor") return "instructor";
  return "student";
}

export function resolveUserRole(
  role: string | { name?: string | null } | null | undefined,
): AppRole {
  if (!role) return "student";
  if (typeof role === "string") return normalizeRoleName(role);
  return normalizeRoleName(role.name);
}

export function resolveRoleFromUser(
  user: Pick<DirectusUser, "role"> | null | undefined,
): AppRole {
  return resolveUserRole(user?.role as string | { name?: string | null } | null);
}

export function getDashboardPath(role: string | { name?: string | null } | null | undefined) {
  const normalizedRole = resolveUserRole(role);
  switch (normalizedRole) {
    case "admin":
      return "/admin/dashboard";
    case "instructor":
      return "/instructor/dashboard";
    default:
      return "/dashboard";
  }
}

export function getPostLoginPath(
  role: string | { name?: string | null } | null | undefined,
) {
  const normalizedRole = resolveUserRole(role);
  return normalizedRole === "admin" ? "/admin/dashboard" : "/";
}
