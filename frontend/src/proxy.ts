import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL =
  process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://localhost:8055";
const isProduction = process.env.NODE_ENV === "production";

const ROLE_COOKIE_OPTIONS = {
  httpOnly: false,
  secure: isProduction,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 604800, // 7 days
};

const publicPaths = [
  "/",
  "/courses",
  "/continue-learning",
  "/categories",
  "/instructors",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

function isPublicPath(pathname: string): boolean {
  return publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/"),
  );
}

function normalizeRoleName(raw: string | null | undefined): string {
  const value = (raw || "").toLowerCase().trim();
  return value === "administrator" ? "admin" : value || "student";
}

function hasPortalAccess(
  pathname: string,
  role: string | null | undefined,
): boolean {
  const normalizedRole = normalizeRoleName(role);

  if (pathname.startsWith("/admin")) {
    return normalizedRole === "admin";
  }

  if (pathname.startsWith("/instructor")) {
    return normalizedRole === "instructor" || normalizedRole === "admin";
  }

  return true;
}

function redirectPrivilegedUserAwayFromLearnPath(
  request: NextRequest,
  role: string | null | undefined,
): NextResponse | null {
  const normalizedRole = normalizeRoleName(role);
  if (
    normalizedRole !== "admin" &&
    normalizedRole !== "instructor"
  ) {
    return null;
  }

  if (!request.nextUrl.pathname.startsWith("/learn/")) {
    return null;
  }

  const [, , rawCourseSlug] = request.nextUrl.pathname.split("/");
  if (!rawCourseSlug) {
    return NextResponse.redirect(new URL("/courses", request.url));
  }

  return NextResponse.redirect(
    new URL(`/courses/${rawCourseSlug}`, request.url),
  );
}

async function resolveRoleFromAccessToken(
  accessToken: string,
): Promise<string | null> {
  try {
    const meRes = await fetch(`${DIRECTUS_URL}/users/me?fields=role.name`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!meRes.ok) return null;

    const meData = await meRes.json().catch(() => null);
    const rawRole: string | undefined = meData?.data?.role?.name;
    return normalizeRoleName(rawRole);
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("access_token")?.value;
  const userRole = request.cookies.get("user_role")?.value;

  // Allow public paths
  if (isPublicPath(pathname)) {
    // Redirect logged-in users away from auth pages
    if (token && ["/login", "/register"].includes(pathname)) {
      const dest =
        userRole === "admin"
          ? "/admin/dashboard"
          : userRole === "instructor"
            ? "/instructor/dashboard"
            : "/dashboard";
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.next();
  }

  // Allow API routes
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Allow static files
  if (pathname.startsWith("/_next/") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // Require authentication for all other routes
  if (!token) {
    return handleMissingAccessToken(request);
  }

  const learnRedirect = redirectPrivilegedUserAwayFromLearnPath(
    request,
    userRole,
  );
  if (learnRedirect) {
    return learnRedirect;
  }

  // Role-based access control with stale-cookie self-heal:
  // after role changes (e.g. student -> instructor), cookie can lag behind token.
  if (!hasPortalAccess(pathname, userRole)) {
    const roleFromToken = await resolveRoleFromAccessToken(token);

    if (roleFromToken && hasPortalAccess(pathname, roleFromToken)) {
      const response = NextResponse.next();
      response.cookies.set("user_role", roleFromToken, ROLE_COOKIE_OPTIONS);
      return response;
    }

    const response = NextResponse.redirect(new URL("/dashboard", request.url));
    if (roleFromToken) {
      response.cookies.set("user_role", roleFromToken, ROLE_COOKIE_OPTIONS);
    }
    return response;
  }

  return NextResponse.next();
}

async function handleMissingAccessToken(
  request: NextRequest,
): Promise<NextResponse> {
  const refreshToken = request.cookies.get("refresh_token")?.value;

  // Anti-loop: if we already attempted refresh on this navigation, go straight to login
  if (request.nextUrl.searchParams.has("_refreshed")) {
    return redirectToLogin(request);
  }

  if (refreshToken) {
    try {
      const refreshRes = await fetch(`${DIRECTUS_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refresh_token: refreshToken,
          mode: "json",
        }),
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        const newAccessToken: string | undefined =
          refreshData?.data?.access_token;
        const newRefreshToken: string | undefined =
          refreshData?.data?.refresh_token;

        if (newAccessToken && newRefreshToken) {
          // Fetch user role with new token
          let roleName = "student";
          try {
            const meRes = await fetch(
              `${DIRECTUS_URL}/users/me?fields=role.name`,
              { headers: { Authorization: `Bearer ${newAccessToken}` } },
            );
            if (meRes.ok) {
              const meData = await meRes.json();
              const rawRole: string =
                meData.data?.role?.name?.toLowerCase() || "student";
              roleName = rawRole === "administrator" ? "admin" : rawRole;
            }
          } catch {
            // Non-critical — use default role
          }

          // Add _refreshed param to prevent loops
          const redirectUrl = new URL(request.nextUrl);
          redirectUrl.searchParams.set("_refreshed", "1");
          const response = NextResponse.redirect(redirectUrl);

          response.cookies.set("access_token", newAccessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: "lax",
            path: "/",
            maxAge: 900, // 15 minutes
          });
          response.cookies.set("refresh_token", newRefreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: "lax",
            path: "/",
            maxAge: 604800, // 7 days
          });
          response.cookies.set("user_role", roleName, {
            ...ROLE_COOKIE_OPTIONS,
          });
          return response;
        }
      }
    } catch (error) {
      console.error("Proxy refresh error:", error);
    }
  }

  return redirectToLogin(request);
}

function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete("access_token");
  response.cookies.delete("refresh_token");
  response.cookies.delete("user_role");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
