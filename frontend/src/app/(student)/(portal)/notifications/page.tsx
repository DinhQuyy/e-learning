import { requireAuth } from "@/lib/dal";
import { getUserNotifications } from "@/lib/queries/notifications";
import { NotificationsList } from "@/components/features/notifications-list";

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const { token } = await requireAuth();
  const { data: notifications, total } = await getUserNotifications(token);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Thông báo</h1>
        <p className="text-muted-foreground">
          Xem tất cả thông báo của bạn
        </p>
      </div>

      <NotificationsList
        initialNotifications={notifications}
        initialTotal={total}
      />
    </div>
  );
}
