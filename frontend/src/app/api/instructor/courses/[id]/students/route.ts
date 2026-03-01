import { NextRequest, NextResponse } from "next/server";
import { directusFetch, getCurrentUserId } from "@/lib/directus-fetch";
import { directusUrl } from "@/lib/directus";

interface StudentItem {
  id: string;
  name: string;
  email: string;
}

type StudentUser =
  | {
      id?: string;
      first_name?: string | null;
      last_name?: string | null;
      email?: string | null;
    }
  | string
  | null
  | undefined;

interface EnrollmentRow {
  id: string;
  user_id?: StudentUser;
}

interface UserProfile {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}

export const dynamic = "force-dynamic";

function extractUsers(enrollments: EnrollmentRow[]): {
  userIds: string[];
  profileMap: Map<string, UserProfile>;
} {
  const seen = new Set<string>();
  const profileMap = new Map<string, UserProfile>();

  for (const enrollment of enrollments) {
    const user = enrollment.user_id;
    const studentId =
      typeof user === "string"
        ? user
        : user?.id
          ? String(user.id)
          : "";

    if (!studentId || seen.has(studentId)) continue;
    seen.add(studentId);

    if (typeof user === "object" && user) {
      profileMap.set(studentId, {
        first_name: user.first_name ?? null,
        last_name: user.last_name ?? null,
        email: user.email ?? null,
      });
    }
  }

  return { userIds: Array.from(seen), profileMap };
}

function resolveStudentName(profile: UserProfile | undefined, email: string): string {
  const fullName = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (fullName) return fullName;
  if (email) {
    const emailPrefix = email.split("@")[0]?.trim() ?? "";
    return emailPrefix || email;
  }

  return "Học viên chưa cập nhật tên";
}

async function verifyOwnership(userId: string, courseId: string): Promise<boolean> {
  const res = await directusFetch(
    `/items/courses_instructors?filter[course_id][_eq]=${courseId}&filter[user_id][_eq]=${userId}&limit=1`
  );
  if (!res.ok) return false;
  const data = await res.json().catch(() => null);
  return (data?.data?.length ?? 0) > 0;
}

async function fetchEnrollmentsWithUserToken(courseId: string): Promise<Response> {
  // Primary: include nested user fields to return names in one call.
  let res = await directusFetch(
    `/items/enrollments?filter[course_id][_eq]=${encodeURIComponent(courseId)}&fields=id,user_id,user_id.id,user_id.first_name,user_id.last_name,user_id.email&sort=-enrolled_at&limit=-1`,
    { cache: "no-store" }
  );
  if (res.ok) return res;

  // Fallback: if nested relation fields are restricted, at least keep raw user_id.
  res = await directusFetch(
    `/items/enrollments?filter[course_id][_eq]=${encodeURIComponent(courseId)}&fields=id,user_id&sort=-enrolled_at&limit=-1`,
    { cache: "no-store" }
  );
  return res;
}

async function fetchEnrollmentsWithServerToken(
  courseId: string
): Promise<EnrollmentRow[] | null> {
  const token = process.env.DIRECTUS_STATIC_TOKEN;
  if (!token) return null;

  const queryWithProfile = `/items/enrollments?filter[course_id][_eq]=${encodeURIComponent(courseId)}&fields=id,user_id,user_id.id,user_id.first_name,user_id.last_name,user_id.email&sort=-enrolled_at&limit=-1`;
  let res = await fetch(`${directusUrl}${queryWithProfile}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const queryRaw = `/items/enrollments?filter[course_id][_eq]=${encodeURIComponent(courseId)}&fields=id,user_id&sort=-enrolled_at&limit=-1`;
    res = await fetch(`${directusUrl}${queryRaw}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
  }

  if (!res.ok) return null;
  const payload = await res.json().catch(() => null);
  return (payload?.data ?? []) as EnrollmentRow[];
}

async function fetchProfilesByIds(userIds: string[]): Promise<Map<string, UserProfile>> {
  if (userIds.length === 0) return new Map();

  const query = `/users?filter[id][_in]=${userIds.join(",")}&fields=id,first_name,last_name,email&limit=-1`;
  let usersRes = await directusFetch(query, { cache: "no-store" });

  // Fallback to server token when instructor policy cannot read these user profiles.
  if (!usersRes.ok && process.env.DIRECTUS_STATIC_TOKEN) {
    usersRes = await fetch(`${directusUrl}${query}`, {
      headers: {
        Authorization: `Bearer ${process.env.DIRECTUS_STATIC_TOKEN}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
  }

  if (!usersRes.ok) return new Map();

  const usersData = await usersRes.json().catch(() => null);
  const users: Array<{
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  }> = usersData?.data ?? [];

  return new Map(
    users.map((u) => [
      String(u.id),
      {
        first_name: u.first_name,
        last_name: u.last_name,
        email: u.email,
      },
    ])
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;

    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "Chưa xác thực." }, { status: 401 });
    }

    const isOwner = await verifyOwnership(currentUserId, courseId);
    if (!isOwner) {
      return NextResponse.json({ error: "Không có quyền truy cập." }, { status: 403 });
    }

    const enrollmentsRes = await fetchEnrollmentsWithUserToken(courseId);
    if (!enrollmentsRes.ok) {
      const detail = await enrollmentsRes.text().catch(() => "");
      return NextResponse.json(
        { error: "Không thể tải danh sách học viên.", detail },
        { status: enrollmentsRes.status }
      );
    }

    const enrollmentsPayload = await enrollmentsRes.json().catch(() => null);
    let enrollments: EnrollmentRow[] = (enrollmentsPayload?.data ?? []) as EnrollmentRow[];
    let { userIds, profileMap: profileFromEnrollment } = extractUsers(enrollments);
    let source = "enrollments.user_id";
    let usedServerTokenFallback = false;

    // Key fallback: enrollments exist but user_id is hidden by permission -> retry with server token.
    if (enrollments.length > 0 && userIds.length === 0) {
      const serverEnrollments = await fetchEnrollmentsWithServerToken(courseId);
      if (serverEnrollments && serverEnrollments.length > 0) {
        const extracted = extractUsers(serverEnrollments);
        if (extracted.userIds.length > 0) {
          enrollments = serverEnrollments;
          userIds = extracted.userIds;
          profileFromEnrollment = extracted.profileMap;
          source = "enrollments.user_id.server_token";
          usedServerTokenFallback = true;
        }
      }
    }

    // Merge user profiles from /users to ensure name/email are available.
    const profileFromUsers = await fetchProfilesByIds(userIds);
    const mergedProfileMap = new Map<string, UserProfile>(profileFromEnrollment);
    for (const [id, profile] of profileFromUsers.entries()) {
      mergedProfileMap.set(id, profile);
    }

    const students: StudentItem[] = userIds.map((id) => {
      const profile = mergedProfileMap.get(id);
      const email = profile?.email ?? "";
      return {
        id,
        name: resolveStudentName(profile, email),
        email,
      };
    });

    return NextResponse.json({
      data: students,
      meta: {
        enrollment_count: enrollments.length,
        student_count: students.length,
        user_id_count: userIds.length,
        missing_user_id_count: Math.max(enrollments.length - userIds.length, 0),
        source,
        used_server_token_fallback: usedServerTokenFallback,
      },
    });
  } catch (error) {
    console.error("GET instructor students error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
  }
}
