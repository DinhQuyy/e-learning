import { requireAuth, getUserRole, getUserDisplayName } from "@/lib/dal";
import { getAssetUrl, directusUrl } from "@/lib/directus";
import { redirect } from "next/navigation";
import { AdminSidebar } from "./admin-sidebar";

async function getAdminBadgeCounts(token: string) {
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const opts = { headers, next: { revalidate: 0 } } as RequestInit;

  try {
    const [coursesRes, ordersRes, reviewsRes, applicationsRes] = await Promise.all([
      fetch(`${directusUrl}/items/courses?aggregate[count]=id&filter[status][_eq]=review`, opts),
      fetch(`${directusUrl}/items/orders?aggregate[count]=id&filter[status][_eq]=pending`, opts),
      fetch(`${directusUrl}/items/reviews?aggregate[count]=id&filter[status][_eq]=pending`, opts),
      fetch(`${directusUrl}/items/instructor_applications?aggregate[count]=id&filter[status][_eq]=pending`, opts).catch(() => null),
    ]);

    const extract = async (res: Response | null) => {
      if (!res || !res.ok) return 0;
      const json = await res.json();
      return Number(json.data?.[0]?.count?.id ?? 0);
    };

    return {
      pendingCourses: await extract(coursesRes),
      pendingOrders: await extract(ordersRes),
      pendingReviews: await extract(reviewsRes),
      pendingApplications: await extract(applicationsRes),
    };
  } catch {
    return { pendingCourses: 0, pendingOrders: 0, pendingReviews: 0, pendingApplications: 0 };
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();
  const userRole = getUserRole(session.user);

  if (userRole !== "admin") {
    redirect("/dashboard");
  }
  const displayName = getUserDisplayName(session.user);
  const avatarUrl = getAssetUrl(session.user.avatar);
  const badgeCounts = await getAdminBadgeCounts(session.token);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar
        userRole={userRole}
        displayName={displayName}
        avatarUrl={avatarUrl}
        userEmail={session.user.email}
        badgeCounts={badgeCounts}
      />
      <div className="lg:pl-64">
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
