"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  User,
  Bell,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Khoá học của tôi",
    href: "/my-courses",
    icon: BookOpen,
  },
  {
    label: "Hồ sơ",
    href: "/profile",
    icon: User,
  },
  {
    label: "Thông báo",
    href: "/notifications",
    icon: Bell,
  },
];

export function StudentSidebar() {
  const pathname = usePathname();

  return (
    <ScrollArea className="flex-1 py-4">
      <nav className="flex flex-col gap-1 px-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </ScrollArea>
  );
}
