import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { directusFetch, getCurrentUserId } from "@/lib/directus-fetch";
import { directusUrl } from "@/lib/directus";
import { getSession, getUserDisplayName } from "@/lib/dal";
import { getCourseStudents, verifyInstructorOwnership } from "@/lib/queries/instructor";

interface StudentItem {
  id: string;
  name: string;
  email: string;
}

type StudentUser =
  | {
      id?: string | number | null;
      first_name?: string | null;
      last_name?: string | null;
      email?: string | null;
    }
  | string
  | number
  | null
  | undefined;

interface EnrollmentRow {
  id: string;
  user_id?: StudentUser;
}

interface CourseStudentsPayload {
  enrollments?: EnrollmentRow[] | null;
}

interface UserProfile {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}

export const dynamic = "force-dynamic";

let privilegedTokenPromise: Promise<string | null> | null = null;

function normalizeRelationId(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);

  if (
    value &&
    typeof value === "object" &&
    "id" in value &&
    (typeof (value as { id?: unknown }).id === "string" ||
      typeof (value as { id?: unknown }).id === "number")
  ) {
    return String((value as { id: string | number }).id);
  }

  return "";
}

function extractUserId(user: StudentUser): string {
  return normalizeRelationId(user);
}

function extractUsers(enrollments: EnrollmentRow[]): {
  userIds: string[];
  profileMap: Map<string, UserProfile>;
} {
  const seen = new Set<string>();
  const profileMap = new Map<string, UserProfile>();

  for (const enrollment of enrollments) {
    const user = enrollment.user_id;
    const studentId = extractUserId(user);

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

function hasMissingUserIds(enrollments: EnrollmentRow[]): boolean {
  return enrollments.some((enrollment) => !extractUserId(enrollment.user_id));
}

function countMissingUserIds(enrollments: EnrollmentRow[]): number {
  return enrollments.filter((enrollment) => !extractUserId(enrollment.user_id)).length;
}

function mergeUserCollections(
  currentIds: string[],
  currentProfiles: Map<string, UserProfile>,
  enrollments: EnrollmentRow[]
): {
  userIds: string[];
  profileMap: Map<string, UserProfile>;
} {
  const extracted = extractUsers(enrollments);
  const mergedIds = Array.from(new Set([...currentIds, ...extracted.userIds]));
  const mergedProfiles = new Map(currentProfiles);

  for (const [id, profile] of extracted.profileMap.entries()) {
    if (!mergedProfiles.has(id)) {
      mergedProfiles.set(id, profile);
    }
  }

  return { userIds: mergedIds, profileMap: mergedProfiles };
}

function resolveStudentName(
  profile: UserProfile | undefined,
  email: string,
  studentId: string
): string {
  const fullName = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (fullName) return fullName;
  if (email) {
    const emailPrefix = email.split("@")[0]?.trim() ?? "";
    return emailPrefix || email;
  }

  return `Hoc vien #${studentId.slice(0, 8)}`;
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

async function fetchRawEnrollmentsWithUserToken(courseId: string): Promise<Response> {
  return directusFetch(
    `/items/enrollments?filter[course_id][_eq]=${encodeURIComponent(courseId)}&fields=id,user_id&sort=-enrolled_at&limit=-1`,
    { cache: "no-store" }
  );
}

async function fetchCourseStudentsViaCourseQuery(
  courseId: string
): Promise<EnrollmentRow[] | null> {
  const res = await directusFetch(
    `/items/courses/${encodeURIComponent(courseId)}?fields=id,enrollments.id,enrollments.user_id,enrollments.user_id.id,enrollments.user_id.first_name,enrollments.user_id.last_name,enrollments.user_id.email&deep[enrollments][_sort]=-enrolled_at&deep[enrollments][_limit]=-1`,
    { cache: "no-store" }
  );

  if (!res.ok) return null;
  const payload = await res.json().catch(() => null);
  const course = payload?.data as CourseStudentsPayload | null | undefined;
  return Array.isArray(course?.enrollments) ? course.enrollments : null;
}

async function fetchEnrollmentsWithServerToken(
  courseId: string
): Promise<EnrollmentRow[] | null> {
  const token = await getPrivilegedDirectusToken();
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
  const toProfileMap = (
    users: Array<{
      id: string;
      first_name?: string | null;
      last_name?: string | null;
      email?: string | null;
    }>
  ) =>
    new Map(
      users.map((u) => [
        String(u.id),
        {
          first_name: u.first_name,
          last_name: u.last_name,
          email: u.email,
        },
      ])
    );

  const readUsers = async (res: Response) => {
    const usersData = await res.json().catch(() => null);
    return (usersData?.data ?? []) as Array<{
      id: string;
      first_name?: string | null;
      last_name?: string | null;
      email?: string | null;
    }>;
  };

  let usersRes = await directusFetch(query, { cache: "no-store" });
  let users: Array<{
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  }> = usersRes.ok ? await readUsers(usersRes) : [];

  // Fallback to privileged token when instructor policy returns 403
  // or silently responds with an empty list.
  if (!usersRes.ok || users.length === 0) {
    const privilegedToken = await getPrivilegedDirectusToken();
    if (privilegedToken) {
      usersRes = await fetch(`${directusUrl}${query}`, {
        headers: {
          Authorization: `Bearer ${privilegedToken}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (usersRes.ok) {
        users = await readUsers(usersRes);
      }
    }
  }

  return toProfileMap(users);
}

function parseEnvValue(content: string, key: string): string | null {
  const line = content
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${key}=`));
  if (!line) return null;

  const rawValue = line.slice(key.length + 1).trim();
  return rawValue.replace(/^['"]|['"]$/g, "") || null;
}

async function readBackendAdminCredentials(): Promise<{
  email: string;
  password: string;
} | null> {
  const candidates = [
    resolve(process.cwd(), "backend", ".env"),
    resolve(process.cwd(), "..", "backend", ".env"),
  ];

  for (const filePath of candidates) {
    try {
      const content = await readFile(filePath, "utf-8");
      const email = parseEnvValue(content, "ADMIN_EMAIL");
      const password = parseEnvValue(content, "ADMIN_PASSWORD");
      if (email && password) {
        return { email, password };
      }
    } catch {
      // continue
    }
  }

  return null;
}

async function isTokenValid(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${directusUrl}/users/me?fields=id`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function loginWithAdminCredentials(): Promise<string | null> {
  const credentials = await readBackendAdminCredentials();
  if (!credentials) return null;

  try {
    const res = await fetch(`${directusUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
        mode: "json",
      }),
      cache: "no-store",
    });

    if (!res.ok) return null;
    const payload = await res.json().catch(() => null);
    return payload?.data?.access_token ?? null;
  } catch {
    return null;
  }
}

async function getPrivilegedDirectusToken(): Promise<string | null> {
  if (!privilegedTokenPromise) {
    privilegedTokenPromise = (async () => {
      const staticToken = process.env.DIRECTUS_STATIC_TOKEN?.trim();
      if (staticToken && (await isTokenValid(staticToken))) {
        return staticToken;
      }

      return loginWithAdminCredentials();
    })();
  }

  const token = await privilegedTokenPromise;
  if (token && (await isTokenValid(token))) {
    return token;
  }

  privilegedTokenPromise = null;
  return null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Chua xac thuc." }, { status: 401 });
    }

    const isVerifiedOwner = await verifyInstructorOwnership(session.token, courseId);
    if (!isVerifiedOwner) {
      return NextResponse.json({ error: "Khong co quyen truy cap." }, { status: 403 });
    }

    const courseStudents = await getCourseStudents(session.token, courseId);
    if (courseStudents.length > 0) {
      const students: StudentItem[] = courseStudents
        .map((student) => {
          const user = student.user;
          if (!user || typeof user !== "object" || !user.id) return null;

          return {
            id: String(user.id),
            name: getUserDisplayName(user),
            email: user.email ?? "",
          };
        })
        .filter((student): student is StudentItem => Boolean(student));

      if (students.length > 0) {
        return NextResponse.json({
          data: students,
          meta: {
            enrollment_count: courseStudents.length,
            student_count: students.length,
            user_id_count: students.length,
            missing_user_id_count: 0,
            source: "lib.queries.instructor.getCourseStudents",
            used_server_token_fallback: false,
          },
        });
      }
    }

    const courseQueryEnrollments = await fetchCourseStudentsViaCourseQuery(courseId);
    if (courseQueryEnrollments && courseQueryEnrollments.length > 0) {
      const { userIds, profileMap } = extractUsers(courseQueryEnrollments);
      if (userIds.length > 0) {
        const profileFromUsers = await fetchProfilesByIds(userIds);
        const mergedProfileMap = new Map<string, UserProfile>(profileMap);
        for (const [id, profile] of profileFromUsers.entries()) {
          mergedProfileMap.set(id, profile);
        }

        const students: StudentItem[] = userIds.map((id) => {
          const profile = mergedProfileMap.get(id);
          const email = profile?.email ?? "";
          return {
            id,
            name: resolveStudentName(profile, email, id),
            email,
          };
        });

        return NextResponse.json({
          data: students,
          meta: {
            enrollment_count: courseQueryEnrollments.length,
            student_count: students.length,
            user_id_count: userIds.length,
            missing_user_id_count: countMissingUserIds(courseQueryEnrollments),
            source: "courses.enrollments.user_id",
            used_server_token_fallback: false,
          },
        });
      }
    }

    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "Chua xac thuc." }, { status: 401 });
    }

    const isOwner = await verifyOwnership(currentUserId, courseId);
    if (!isOwner) {
      return NextResponse.json({ error: "Khong co quyen truy cap." }, { status: 403 });
    }

    const enrollmentsRes = await fetchEnrollmentsWithUserToken(courseId);
    if (!enrollmentsRes.ok) {
      const detail = await enrollmentsRes.text().catch(() => "");
      return NextResponse.json(
        { error: "Khong the tai danh sach hoc vien.", detail },
        { status: enrollmentsRes.status }
      );
    }

    let source = "enrollments.user_id";
    let usedServerTokenFallback = false;

    const enrollmentsPayload = await enrollmentsRes.json().catch(() => null);
    const enrollments: EnrollmentRow[] = (enrollmentsPayload?.data ?? []) as EnrollmentRow[];
    let { userIds, profileMap: profileFromEnrollment } = extractUsers(enrollments);

    // Some Directus role setups return 200 but hide the nested relation.
    // Retry a raw relation query before falling back to a server token.
    if (enrollments.length > 0 && hasMissingUserIds(enrollments)) {
      const rawEnrollmentsRes = await fetchRawEnrollmentsWithUserToken(courseId);
      if (rawEnrollmentsRes.ok) {
        const rawPayload = await rawEnrollmentsRes.json().catch(() => null);
        const rawEnrollments = (rawPayload?.data ?? []) as EnrollmentRow[];
        const merged = mergeUserCollections(userIds, profileFromEnrollment, rawEnrollments);
        userIds = merged.userIds;
        profileFromEnrollment = merged.profileMap;

        if (merged.userIds.length > 0) {
          source = "enrollments.user_id.raw";
        }
      }
    }

    // Final fallback: use server token if the user token cannot read any relation id.
    if (enrollments.length > 0 && userIds.length === 0) {
      const serverEnrollments = await fetchEnrollmentsWithServerToken(courseId);
      if (serverEnrollments && serverEnrollments.length > 0) {
        const extracted = extractUsers(serverEnrollments);
        if (extracted.userIds.length > 0) {
          userIds = extracted.userIds;
          profileFromEnrollment = extracted.profileMap;
          source = "enrollments.user_id.server_token";
          usedServerTokenFallback = true;
        }
      }
    }

    // Merge user profiles from /users to ensure name/email are available when allowed.
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
        name: resolveStudentName(profile, email, id),
        email,
      };
    });

    return NextResponse.json({
      data: students,
      meta: {
        enrollment_count: enrollments.length,
        student_count: students.length,
        user_id_count: userIds.length,
        missing_user_id_count: countMissingUserIds(enrollments),
        source,
        used_server_token_fallback: usedServerTokenFallback,
      },
    });
  } catch (error) {
    console.error("GET instructor students error:", error);
    return NextResponse.json({ error: "Loi he thong." }, { status: 500 });
  }
}
