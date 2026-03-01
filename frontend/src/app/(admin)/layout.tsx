import { requireAuth, getUserRole, getUserDisplayName } from "@/lib/dal";
import { getAssetUrl } from "@/lib/directus";
import { redirect } from "next/navigation";
import { AdminSidebar } from "./admin-sidebar";

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

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar
        userRole={userRole}
        displayName={displayName}
        avatarUrl={avatarUrl}
        userEmail={session.user.email}
      />
      <div className="lg:pl-64">
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
