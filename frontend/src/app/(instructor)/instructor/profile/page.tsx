import { requireRole, getUserDisplayName } from "@/lib/dal";
import { getAssetUrl } from "@/lib/directus";
import { InstructorProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

export default async function InstructorProfilePage() {
  const { user } = await requireRole(["instructor"]);
  const displayName = getUserDisplayName(user);
  const initials =
    [user.first_name?.[0], user.last_name?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() || user.email?.[0]?.toUpperCase() || "U";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hồ sơ giảng viên</h1>
        <p className="text-muted-foreground">
          Quản lý thông tin cá nhân của bạn
        </p>
      </div>

      <InstructorProfileForm
        user={{
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          avatar: user.avatar,
          headline: user.headline,
          phone: user.phone,
          bio: user.bio,
          social_links: user.social_links,
          date_created: user.date_created,
          status: user.status,
        }}
        displayName={displayName}
        initials={initials}
        avatarUrl={getAssetUrl(user.avatar)}
      />
    </div>
  );
}
