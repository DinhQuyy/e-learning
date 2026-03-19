"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FolderTree,
  MessageSquare,
  BarChart3,
  ShoppingBag,
  Settings,
  Menu,
  ChevronDown,
  Shield,
  FileCheck2,
  RotateCcw,
} from "lucide-react";
import { LogoutButton } from "@/components/features/logout-button";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

const navItems = [
  {
    href: "/admin/dashboard",
    label: "Tổng quan",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/users",
    label: "Người dùng",
    icon: Users,
  },
  {
    href: "/admin/courses",
    label: "Khóa học",
    icon: BookOpen,
  },
  {
    href: "/admin/categories",
    label: "Danh mục",
    icon: FolderTree,
  },
  {
    href: "/admin/reviews",
    label: "Đánh giá",
    icon: MessageSquare,
  },
  {
    href: "/admin/orders",
    label: "Đơn hàng",
    icon: ShoppingBag,
  },
  {
    href: "/admin/instructor-applications",
    label: "Đăng ký giảng viên",
    icon: FileCheck2,
  },
  {
    href: "/admin/instructor-reactivations",
    label: "Kích hoạt lại GV",
    icon: RotateCcw,
  },
  {
    href: "/admin/reports",
    label: "Báo cáo",
    icon: BarChart3,
  },
  {
    href: "/admin/settings",
    label: "Cài đặt",
    icon: Settings,
  },
];

const navLabels: Record<string, string> = {
  "/admin/dashboard": "Tổng quan",
  "/admin/users": "Người dùng",
  "/admin/courses": "Khóa học",
  "/admin/categories": "Danh mục",
  "/admin/reviews": "Đánh giá",
  "/admin/orders": "Đơn hàng",
  "/admin/instructor-applications": "Đăng ký giảng viên",
  "/admin/instructor-reactivations": "Kích hoạt lại GV",
  "/admin/reports": "Báo cáo",
  "/admin/settings": "Cài đặt",
};

interface BadgeCounts {
  pendingCourses: number;
  pendingOrders: number;
  pendingReviews: number;
  pendingApplications: number;
}

interface AdminSidebarProps {
  userRole: string;
  displayName: string;
  avatarUrl: string;
  userEmail: string;
  badgeCounts?: BadgeCounts;
}

const badgeMap: Record<string, keyof BadgeCounts> = {
  "/admin/courses": "pendingCourses",
  "/admin/orders": "pendingOrders",
  "/admin/reviews": "pendingReviews",
  "/admin/instructor-applications": "pendingApplications",
};

function SidebarNav({ onNavClick, badgeCounts }: { onNavClick?: () => void; badgeCounts?: BadgeCounts }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        const badgeKey = badgeMap[item.href];
        const badgeCount = badgeKey && badgeCounts ? badgeCounts[badgeKey] : 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "border-l-4 border-blue-400 bg-slate-800 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white",
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="flex-1">{navLabels[item.href] ?? item.label}</span>
            {badgeCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                {badgeCount > 99 ? "99+" : badgeCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminSidebar({
  displayName,
  avatarUrl,
  userEmail,
  badgeCounts,
}: AdminSidebarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const renderSidebarContent = () => (
    <>
      <div className="flex h-16 items-center gap-3 px-6">
        <Shield className="h-7 w-7 text-blue-400" />
        <div>
          <h2 className="text-sm font-bold text-white">Quản trị hệ thống</h2>
          <p className="text-xs text-slate-400">Bảng quản trị Kiwi</p>
        </div>
      </div>
      <Separator className="bg-slate-700" />
      <SidebarNav onNavClick={() => setSheetOpen(false)} badgeCounts={badgeCounts} />
      <Separator className="bg-slate-700" />
      <div className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg p-2 text-left text-sm text-slate-300 transition-colors hover:bg-slate-800">
              <Avatar className="h-8 w-8">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="bg-blue-600 text-xs text-white">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 truncate">
                <p className="truncate text-sm font-medium text-white">
                  {displayName}
                </p>
                <p className="truncate text-xs text-slate-400">{userEmail}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Trang chủ học viên
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <LogoutButton
                variant="ghost"
                showLabel
                className="h-auto w-full cursor-pointer justify-start px-2 py-1.5 font-normal"
              />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-slate-900 lg:flex">
        {renderSidebarContent()}
      </aside>

      <div className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-slate-900 px-4 lg:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-slate-800"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-64 border-r-0 bg-slate-900 p-0"
            showCloseButton={false}
          >
            <SheetTitle className="sr-only">Menu quản trị</SheetTitle>
            {renderSidebarContent()}
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-400" />
          <span className="text-sm font-bold text-white">Quản trị hệ thống</span>
        </div>
      </div>
    </>
  );
}
