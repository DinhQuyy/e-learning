"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, BookOpen, LayoutGrid, LogIn, UserPlus } from "lucide-react";
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

const navLinks = [
  { href: "/courses", label: "Khoá học", icon: BookOpen },
  { href: "/categories", label: "Danh mục", icon: LayoutGrid },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { isLoggedIn } = useAuth();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="text-lg font-bold"
            >
              E-Learning
            </Link>
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 p-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent",
                pathname === link.href || pathname.startsWith(link.href + "/")
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              <link.icon className="size-4" />
              {link.label}
            </Link>
          ))}
        </nav>
        <Separator />
        <div className="p-4">
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent text-muted-foreground"
            >
              Bảng điều khiển
            </Link>
          ) : (
            <div className="flex flex-col gap-2">
              <Button asChild variant="default" className="w-full">
                <Link href="/login" onClick={() => setOpen(false)}>
                  <LogIn className="size-4" />
                  Đăng nhập
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/register" onClick={() => setOpen(false)}>
                  <UserPlus className="size-4" />
                  Đăng ký
                </Link>
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
