import { requireRole, getUserDisplayName, getUserRole } from "@/lib/dal";
import { getAssetUrl } from "@/lib/directus";
import { InstructorSidebar } from "@/components/features/instructor-sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Menu, User, GraduationCap } from "lucide-react";
import Link from "next/link";
import { LogoutButton } from "@/components/features/logout-button";

export default async function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireRole(["instructor"]);
  const displayName = getUserDisplayName(user);
  const role = getUserRole(user);
  const initials = [user.first_name?.[0], user.last_name?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase() || user.email?.[0]?.toUpperCase() || "U";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r">
        <div className="flex h-14 items-center gap-2 border-b px-6">
          <Link
            href="/instructor/dashboard"
            className="flex items-center gap-2"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-sm">
              <GraduationCap className="size-4" />
            </div>
            <span className="font-semibold text-lg">Instructor Portal</span>
          </Link>
        </div>
        <InstructorSidebar />
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
                <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-sm">
                  <GraduationCap className="size-4" />
                </div>
                <span className="font-semibold text-lg">Instructor Portal</span>
              </div>
              <InstructorSidebar />
            </SheetContent>
          </Sheet>

          <div className="hidden lg:block">
            <h2 className="text-sm font-medium text-muted-foreground">
              Instructor Portal
            </h2>
          </div>

          <div className="flex-1" />

          <Separator orientation="vertical" className="h-6" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors outline-none">
                <Avatar>
                  <AvatarImage
                    src={getAssetUrl(user.avatar)}
                    alt={displayName}
                  />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium leading-none">
                    {displayName}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {role}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <LogoutButton variant="ghost" showLabel className="w-full justify-start cursor-pointer h-auto px-2 py-1.5 font-normal" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-4 lg:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
