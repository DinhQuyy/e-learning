import { redirect } from "next/navigation";
import { getUserRole, requireAuth } from "@/lib/dal";
import { getDashboardPath } from "@/lib/role-routing";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireAuth();
  const role = getUserRole(user);

  if (role === "admin" || role === "instructor") {
    redirect(getDashboardPath(role));
  }

  return <>{children}</>;
}
