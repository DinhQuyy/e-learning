"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CircleHelp,
  Home,
  LayoutGrid,
  LogIn,
  Menu,
  Tag,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { getDashboardPath } from "@/lib/role-routing";

const navLinks = [
  { href: "/", label: "Trang chủ", icon: Home },
  { href: "/courses", label: "Khóa học", icon: BookOpen },
  { href: "/categories", label: "Danh mục", icon: LayoutGrid },
  { href: "/pricing", label: "Bảng giá", icon: Tag },
  { href: "/help", label: "Hỗ trợ", icon: CircleHelp },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { isLoggedIn, role } = useAuth();
  const dashboardPath = getDashboardPath(role);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full lg:hidden" aria-label="Menu">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="border-b px-6 py-5 text-left">
          <SheetTitle>
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-2"
            >
              <span
                className="inline-flex size-9 items-center justify-center rounded-lg text-sm font-extrabold text-white"
                style={{
                  backgroundImage: "linear-gradient(90deg, #2f57ef, #b966e7)",
                }}
              >
                E
              </span>
              <span className="text-base font-bold">E-Learning</span>
            </Link>
          </SheetTitle>
        </SheetHeader>

        <div className="p-4">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Điều hướng
          </p>
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                  link.href === "/"
                    ? pathname === "/"
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    : pathname === link.href || pathname.startsWith(`${link.href}/`)
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <link.icon className="size-4" />
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <Separator />

        <div className="space-y-3 p-4">
          {isLoggedIn ? (
            <Button asChild className="w-full rounded-xl">
              <Link href={dashboardPath} onClick={() => setOpen(false)}>
                Bảng điều khiển
              </Link>
            </Button>
          ) : (
            <>
              <Button
                asChild
                className="w-full rounded-xl border-0 text-white"
                style={{ backgroundImage: "linear-gradient(90deg, #2f57ef, #b966e7)" }}
              >
                <Link href="/login" onClick={() => setOpen(false)}>
                  <LogIn className="size-4" />
                  Đăng nhập
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full rounded-xl">
                <Link href="/register" onClick={() => setOpen(false)}>
                  <UserPlus className="size-4" />
                  Đăng ký
                </Link>
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
