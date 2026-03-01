import { cookies } from "next/headers";

const DIRECTUS_URL =
  process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://localhost:8055";
const isProduction = process.env.NODE_ENV === "production";

const COOKIE_OPTIONS_ACCESS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 900, // 15 minutes
};

const COOKIE_OPTIONS_REFRESH = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 604800, // 7 days
};

const COOKIE_OPTIONS_ROLE = {
  httpOnly: false,
  secure: isProduction,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 604800, // 7 days
};

interface DirectusFetchOptions extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
}

/**
 * Server-side fetch wrapper for Directus API.
 * - Auto-attaches access_token from cookies
 * - Auto-refreshes on 401 and retries once
 * - Prepends DIRECTUS_URL to relative paths
 */
export async function directusFetch(
  path: string,
  options: DirectusFetchOptions = {},
): Promise<Response> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  const url = path.startsWith("http") ? path : `${DIRECTUS_URL}${path}`;

  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...options.headers,
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  // If 401, attempt token refresh and retry once
  if (res.status === 401) {
    const refreshToken = cookieStore.get("refresh_token")?.value;
    if (!refreshToken) {
      clearAuthCookies(cookieStore);
      return res;
    }

    const refreshRes = await fetch(`${DIRECTUS_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken, mode: "json" }),
    });

    if (!refreshRes.ok) {
      clearAuthCookies(cookieStore);
      return res;
    }

    const refreshData = await refreshRes.json();
    const newAccessToken: string | undefined =
      refreshData?.data?.access_token;
    const newRefreshToken: string | undefined =
      refreshData?.data?.refresh_token;

    if (!newAccessToken || !newRefreshToken) {
      clearAuthCookies(cookieStore);
      return res;
    }

    // Update cookies with new tokens
    cookieStore.set("access_token", newAccessToken, COOKIE_OPTIONS_ACCESS);
    cookieStore.set("refresh_token", newRefreshToken, COOKIE_OPTIONS_REFRESH);

    // Also refresh user_role cookie
    try {
      const meRes = await fetch(`${DIRECTUS_URL}/users/me?fields=role.name`, {
        headers: { Authorization: `Bearer ${newAccessToken}` },
      });
      if (meRes.ok) {
        const meData = await meRes.json();
        const rawRole: string =
          meData.data?.role?.name?.toLowerCase() || "student";
        const roleName = rawRole === "administrator" ? "admin" : rawRole;
        cookieStore.set("user_role", roleName, COOKIE_OPTIONS_ROLE);
      }
    } catch {
      // Non-critical — role cookie refresh failed but tokens are valid
    }

    // Retry original request with new token
    headers["Authorization"] = `Bearer ${newAccessToken}`;
    return fetch(url, { ...options, headers });
  }

  return res;
}

/**
 * Get the current user's ID from Directus.
 * Uses the access token from cookies.
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const res = await directusFetch("/users/me?fields=id");
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Extract a user-friendly error message from a Directus error response.
 */
export async function getDirectusError(
  res: Response,
  fallback: string,
): Promise<string> {
  try {
    const data = await res.json();
    return data?.errors?.[0]?.message || fallback;
  } catch {
    return fallback;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function clearAuthCookies(cookieStore: any) {
  cookieStore.delete("access_token");
  cookieStore.delete("refresh_token");
  cookieStore.delete("user_role");
}
