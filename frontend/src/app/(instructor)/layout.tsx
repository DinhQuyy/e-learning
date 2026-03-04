import { BookOpen, Star, Users } from "lucide-react";
import { getUserDisplayName, requireRole } from "@/lib/dal";
import { PortalShell } from "@/components/portal/portal-shell";
import { instructorPortalNavItems } from "@/components/portal/portal-nav-config";
import { getInstructorStats } from "@/lib/queries/instructor";

export default async function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { token, user } = await requireRole(["instructor"]);
  const displayName = getUserDisplayName(user);
  const stats = await getInstructorStats(token);

  return (
    <PortalShell
      roleLabel="Instructor Portal"
      displayName={displayName}
      avatar={user.avatar}
      subtitle="Quản lý khóa học, theo dõi học viên và nâng cao chất lượng giảng dạy."
      greeting={`Xin chào, ${displayName}`}
      navItems={instructorPortalNavItems}
      stats={[
        {
          label: "Khóa học",
          value: String(stats.totalCourses),
          icon: <BookOpen className="size-3.5" />,
        },
        {
          label: "Học viên",
          value: String(stats.totalStudents),
          icon: <Users className="size-3.5" />,
        },
        {
          label: "Đánh giá TB",
          value: stats.averageRating > 0 ? stats.averageRating.toFixed(1) : "--",
          icon: <Star className="size-3.5" />,
        },
      ]}
    >
      {children}
    </PortalShell>
  );
}
