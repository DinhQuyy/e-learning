import { directusUrl } from "@/lib/directus";
import type { Notification } from "@/types";

export async function getUserNotifications(
  token: string,
  page: number = 1,
  limit: number = 20
): Promise<{ data: Notification[]; total: number }> {
  const offset = (page - 1) * limit;
  const res = await fetch(
    `${directusUrl}/items/notifications?sort=-date_created&limit=${limit}&offset=${offset}&meta=filter_count`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) {
    return { data: [], total: 0 };
  }

  const json = await res.json();
  return {
    data: json.data ?? [],
    total: json.meta?.filter_count ?? 0,
  };
}

export async function getUnreadCount(token: string): Promise<number> {
  const res = await fetch(
    `${directusUrl}/items/notifications?filter[is_read][_eq]=false&aggregate[count]=id`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) return 0;

  const data = await res.json();
  return data.data?.[0]?.count?.id ?? 0;
}
