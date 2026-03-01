"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, BookOpen, User } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const navItems = [
  {
    label: "Dashboard",
    href: "/instructor/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Khoá học",
    href: "/instructor/courses",
    icon: BookOpen,
  },
  {
    label: "Hồ sơ",
    href: "/instructor/profile",
    icon: User,
  },
];

export function InstructorSidebar() {
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
                  ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
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
