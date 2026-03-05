import { cookies } from "next/headers";

const isProduction = process.env.NODE_ENV === "production";

export async function setUserRoleCookie(
  roleName: "student" | "instructor" | "admin",
) {
  const cookieStore = await cookies();
  cookieStore.set("user_role", roleName, {
    httpOnly: false,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 604800,
  });
}

