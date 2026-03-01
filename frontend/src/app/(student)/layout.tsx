import { requireAuth, getUserDisplayName, getUserRole } from "@/lib/dal";
import { redirect } from "next/navigation";
import { getAssetUrl } from "@/lib/directus";
import { getUnreadCount } from "@/lib/queries/notifications";
import { StudentSidebar } from "@/components/features/student-sidebar";
import { NotificationBell } from "@/components/features/notification-bell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Menu } from "lucide-react";
import Link from "next/link";
import { LogoutButton } from "@/components/features/logout-button";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { token, user } = await requireAuth();
  const role = getUserRole(user);

  // Redirect non-students to their proper dashboard
  if (role === "admin") redirect("/admin/dashboard");
  if (role === "instructor") redirect("/instructor/dashboard");

  const displayName = getUserDisplayName(user);
  const unreadCount = await getUnreadCount(token);
  const initials = [user.first_name?.[0], user.last_name?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase() || user.email?.[0]?.toUpperCase() || "U";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r">
        <div className="flex h-14 items-center gap-2 border-b px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              EL
            </div>
            <span className="font-semibold text-lg">E-Learning</span>
          </Link>
        </div>
        <StudentSidebar />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="size-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">Menu điều hướng</SheetTitle>
              <div className="flex h-14 items-center gap-2 border-b px-6">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                  EL
                </div>
                <span className="font-semibold text-lg">E-Learning</span>
              </div>
              <StudentSidebar />
            </SheetContent>
          </Sheet>

          <div className="flex-1" />

          <NotificationBell initialCount={unreadCount} />

          <Separator orientation="vertical" className="h-6" />

          <div className="flex items-center gap-3">
            <Avatar size="default">
              <AvatarImage
                src={getAssetUrl(user.avatar)}
                alt={displayName}
              />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="hidden sm:block">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              <p className="text-xs text-muted-foreground capitalize">{role}</p>
            </div>
          </div>

          <LogoutButton className="text-muted-foreground" />
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-4 lg:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
