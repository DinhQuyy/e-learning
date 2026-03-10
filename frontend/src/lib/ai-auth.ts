import { directusFetch } from '@/lib/directus-fetch';

export type AiUserContext = {
  userId: string;
  role: 'admin' | 'instructor' | 'student';
};

export async function getAiUserContext(): Promise<AiUserContext | null> {
  const res = await directusFetch('/users/me?fields=id,role.name,role.id');
  if (!res.ok) return null;

  const payload = await res.json().catch(() => null);
  const userId = payload?.data?.id;
  const roleNameRaw = String(payload?.data?.role?.name ?? '').toLowerCase();

  if (!userId) return null;

  const role = ['administrator', 'admin'].includes(roleNameRaw)
    ? 'admin'
    : roleNameRaw === 'instructor'
      ? 'instructor'
      : 'student';

  return {
    userId: String(userId),
    role,
  };
}

export async function ensureEnrollment(userId: string, courseId: string): Promise<boolean> {
  const encodedUserId = encodeURIComponent(userId);
  const encodedCourseId = encodeURIComponent(courseId);

  const res = await directusFetch(
    `/items/enrollments?filter[user_id][_eq]=${encodedUserId}&filter[course_id][_eq]=${encodedCourseId}&limit=1&fields=id`
  );

  if (!res.ok) return false;
  const payload = await res.json().catch(() => null);
  return Array.isArray(payload?.data) && payload.data.length > 0;
}
