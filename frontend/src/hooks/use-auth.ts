import { useAuthStore } from "@/stores/auth-store";

export function useAuth() {
  const { user, isLoading } = useAuthStore();

  const role = user?.role;
  const rawName =
    typeof role === "object" ? role?.name?.toLowerCase() : "";
  // Normalize: Directus default "administrator" → "admin"
  const roleName = rawName === "administrator" ? "admin" : rawName;

  return {
    user,
    isLoading,
    isLoggedIn: !!user,
    isAdmin: roleName === "admin",
    isInstructor: roleName === "instructor" || roleName === "admin",
    isStudent: roleName === "student",
    role: roleName || null,
  };
}
