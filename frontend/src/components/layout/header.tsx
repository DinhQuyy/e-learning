"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  ShoppingCart,
  Moon,
  Sun,
  LogIn,
  UserPlus,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-fetch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useAuthStore } from "@/stores/auth-store";
import { getAssetUrl } from "@/lib/directus";
import { cn } from "@/lib/utils";

// Load mobile nav only on client to avoid hydration ID drift from Radix primitives
const MobileNav = dynamic(
  () => import("@/components/layout/mobile-nav").then((m) => m.MobileNav),
  { ssr: false }
);

const navLinks = [
  { href: "/courses", label: "Khoá học" },
  { href: "/categories", label: "Danh mục" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoggedIn } = useAuth();
  const logout = useAuthStore((s) => s.logout);
  const { theme, setTheme } = useTheme();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    if (!isLoggedIn) {
      setCartCount(0);
      return;
    }
    apiFetch("/api/cart")
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((json) => setCartCount(json.data?.length ?? 0))
      .catch(() => {});
  }, [isLoggedIn]);

  const handleLogout = async () => {
    await logout();
    router.push("/");
    router.refresh();
  };

  const userInitials = user
    ? (user.first_name && user.last_name
        ? `${user.first_name[0]}${user.last_name[0]}`
        : user.email.slice(0, 2)
      ).toUpperCase()
    : "";

  const userDisplayName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email
    : "";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <MobileNav />
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="bg-primary text-primary-foreground rounded-md px-2 py-0.5 text-sm font-bold">
              E
            </span>
            <span className="hidden sm:inline">E-Learning</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  pathname === link.href || pathname.startsWith(link.href + "/")
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild aria-label="Tìm kiếm">
            <Link href="/courses?search=">
              <Search className="size-4" />
            </Link>
          </Button>

          {isLoggedIn && (
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="relative"
              aria-label="Giỏ hàng"
            >
              <Link href="/cart">
                <ShoppingCart className="size-4" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </Link>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Chuyển đổi giao diện"
          >
            <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {isLoggedIn && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                  aria-label="Menu người dùng"
                >
                  <Avatar className="size-8">
                    <AvatarImage
                      src={getAssetUrl(user.avatar)}
                      alt={userDisplayName}
                    />
                    <AvatarFallback className="text-xs">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {userDisplayName}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => router.push("/dashboard")}
                  className="cursor-pointer"
                >
                  <LayoutDashboard className="size-4" />
                  Bảng điều khiển
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer"
                  variant="destructive"
                >
                  <LogOut className="size-4" />
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">
                  <LogIn className="size-4" />
                  Đăng nhập
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">
                  <UserPlus className="size-4" />
                  Đăng ký
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
