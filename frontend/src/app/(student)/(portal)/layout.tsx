import { Award, BookOpen, CheckCircle2 } from "lucide-react";
import { getUserDisplayName, requireAuth } from "@/lib/dal";
import { partitionEnrollments } from "@/lib/enrollment-helpers";
import { recalcEnrollmentsProgress } from "@/lib/enrollment-progress";
import { getUserEnrollments } from "@/lib/queries/enrollments";
import { PortalShell } from "@/components/portal/portal-shell";
import { studentPortalNavItems } from "@/components/portal/portal-nav-config";

export default async function StudentPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { token, user } = await requireAuth();
  const displayName = getUserDisplayName(user);

  const enrollmentsRaw = await getUserEnrollments(token);

  const enrollments = await recalcEnrollmentsProgress(enrollmentsRaw, token);
  const { active, completed } = partitionEnrollments(enrollments);

  return (
    <PortalShell
      roleLabel="Student Portal"
      displayName={displayName}
      avatar={user.avatar}
      subtitle="Theo dõi tiến độ học tập, khóa học và đơn hàng của bạn."
      greeting={`Xin chào, ${displayName}`}
      navItems={studentPortalNavItems}
      stats={[
        {
          label: "Khóa học đang học",
          value: String(active.length),
          icon: <BookOpen className="size-3.5" />,
        },
        {
          label: "Hoàn thành",
          value: String(completed.length),
          icon: <CheckCircle2 className="size-3.5" />,
        },
        {
          label: "Tổng khóa học",
          value: String(enrollments.length),
          icon: <Award className="size-3.5" />,
        },
      ]}
    >
      {children}
    </PortalShell>
  );
}
