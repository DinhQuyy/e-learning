"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  Bell,
  BookOpen,
  ClipboardList,
  DollarSign,
  GraduationCap,
  Heart,
  LayoutDashboard,
  PlusCircle,
  ShoppingCart,
  Star,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PortalNavIcon, PortalNavItem } from "@/components/portal/portal-nav-config";

interface PortalSideNavProps {
  greeting: string;
  items: PortalNavItem[];
}

const iconMap: Record<PortalNavIcon, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  profile: User,
  courses: BookOpen,
  wishlist: Heart,
  certificates: Award,
  orders: ClipboardList,
  notifications: Bell,
  cart: ShoppingCart,
  reviews: Star,
  "instructor-application": GraduationCap,
  earnings: DollarSign,
  "new-course": PlusCircle,
};

function isActivePath(pathname: string, href: string): boolean {
  if (href === pathname) return true;
  return pathname.startsWith(`${href}/`);
}

export function PortalSideNav({ greeting, items }: PortalSideNavProps) {
  const pathname = usePathname();

  return (
    <>
      <div className="learnify-portal-mobile-nav lg:hidden">
        <div className="no-scrollbar overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <ul className="flex min-w-max items-center gap-2">
            {items.map((item) => {
              const Icon = iconMap[item.icon];
              const active = isActivePath(pathname, item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-[#eef3ff] text-[#2f57ef]"
                        : "text-slate-600 hover:bg-slate-100",
                    )}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <aside className="hidden lg:block">
        <div className="learnify-portal-card overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 bg-gradient-to-r from-[#eef3ff] to-[#f6efff] px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              {greeting}
            </p>
          </div>

          <nav className="p-3">
            <ul className="space-y-1">
              {items.map((item) => {
                const Icon = iconMap[item.icon];
                const active = isActivePath(pathname, item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-[#eef3ff] text-[#2f57ef]"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>
    </>
  );
}
