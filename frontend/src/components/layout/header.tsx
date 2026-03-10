"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  CircleHelp,
  LayoutGrid,
  Search,
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
import { HeaderCartSheet } from "@/components/layout/header-cart-sheet";
import { HeaderSearchDialog } from "@/components/layout/header-search-dialog";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useAuth } from "@/hooks/use-auth";
import { useAuthStore } from "@/stores/auth-store";
import { getAssetUrl } from "@/lib/directus";
import { cn } from "@/lib/utils";
import { getDashboardPath } from "@/lib/role-routing";

interface HeaderCategory {
  id: string;
  name: string;
  slug: string;
  parent_id?: unknown;
}

const navLinks = [
  { href: "/", label: "Trang chủ" },
  { href: "/courses", label: "Khóa học" },
  { href: "/pricing", label: "Bảng giá" },
  { href: "/help", label: "Hỗ trợ" },
];

const fallbackCategories: HeaderCategory[] = [
  { id: "kinh-doanh", name: "Kinh doanh", slug: "kinh-doanh" },
  { id: "lap-trinh", name: "Lập trình", slug: "lap-trinh" },
  { id: "ngoai-ngu", name: "Ngoại ngữ", slug: "ngoai-ngu" },
  { id: "phat-trien-ca-nhan", name: "Phát triển bản thân", slug: "phat-trien-ca-nhan" },
  { id: "thiet-ke", name: "Thiết kế", slug: "thiet-ke" },
];

function hasParent(parent: unknown): boolean {
  if (!parent) return false;
  if (typeof parent === "string") return parent.length > 0;
  if (typeof parent === "object") {
    return Boolean((parent as { id?: string | number }).id);
  }
  return false;
}

function getSafeInitials(user: {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}): string {
  const first =
    typeof user.first_name === "string" ? user.first_name.trim() : "";
  const last = typeof user.last_name === "string" ? user.last_name.trim() : "";
  const email = typeof user.email === "string" ? user.email.trim() : "";

  const fromName = `${first[0] ?? ""}${last[0] ?? ""}`.trim();
  if (fromName) {
    return fromName.toUpperCase();
  }

  if (email) {
    return email.slice(0, 2).toUpperCase();
  }

  return "U";
}

function getSafeDisplayName(user: {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}): string {
  const first =
    typeof user.first_name === "string" ? user.first_name.trim() : "";
  const last = typeof user.last_name === "string" ? user.last_name.trim() : "";
  const fullName = [first, last].filter(Boolean).join(" ");

  if (fullName) {
    return fullName;
  }

  if (typeof user.email === "string" && user.email.trim().length > 0) {
    return user.email;
  }

  return "User";
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoggedIn, role } = useAuth();
  const logout = useAuthStore((s) => s.logout);
  const { theme, setTheme } = useTheme();

  const [categories, setCategories] = useState<HeaderCategory[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    apiFetch("/api/categories")
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((json: { data?: HeaderCategory[] }) => {
        if (!mounted) return;
        setCategories(Array.isArray(json.data) ? json.data : []);
      })
      .catch(() => {
        if (!mounted) return;
        setCategories([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/");
    router.refresh();
  };

  const userInitials = user ? getSafeInitials(user) : "";
  const userDisplayName = user ? getSafeDisplayName(user) : "";
  const userEmail =
    user && typeof user.email === "string" && user.email.trim().length > 0
      ? user.email
      : "";
  const dashboardPath = getDashboardPath(role);

  const topCategories = useMemo(() => {
    const source =
      categories.length > 0
        ? categories.filter((item) => !hasParent(item.parent_id))
        : fallbackCategories;

    return source.slice(0, 10);
  }, [categories]);

  const primaryCategories = topCategories.slice(0, 6);
  const secondaryCategories = topCategories.slice(6);

  const isActiveLink = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:h-[84px] lg:px-8">
        <div className="flex items-center gap-2 lg:gap-6">
          <MobileNav />

          <Link href="/" className="flex items-center gap-2 rounded-xl pr-2">
            <span
              className="inline-flex size-9 items-center justify-center rounded-lg text-sm font-extrabold text-white"
              style={{
                backgroundImage: "linear-gradient(90deg, #2f57ef, #b966e7)",
              }}
            >
              E
            </span>
            <div className="hidden sm:block">
              <p className="text-sm font-bold leading-none">E-Learning</p>
              <p className="mt-1 text-[11px] leading-none text-muted-foreground">
                Học tập trực tuyến
              </p>
            </div>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="hidden h-10 rounded-full border-border/70 px-4 text-sm font-semibold lg:inline-flex"
              >
                <LayoutGrid className="size-4 text-[#2f57ef]" />
                Danh mục
                <ChevronDown className="size-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[540px] p-0">
              <div className="grid grid-cols-[1.2fr_1fr]">
                <div className="border-r p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Danh mục nổi bật
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {primaryCategories.map((category) => (
                      <Link
                        key={category.id}
                        href={category.slug ? `/categories/${category.slug}` : "/categories"}
                        className="rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                      >
                        {category.name}
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="space-y-3 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Khám phá nhanh
                  </p>
                  <Link
                    href="/courses?sort=popular"
                    className="block rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    Khóa học phổ biến
                  </Link>
                  <Link
                    href="/courses?sort=newest"
                    className="block rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    Khóa học mới nhất
                  </Link>
                  <Link
                    href="/categories"
                    className="block rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    Tất cả danh mục
                  </Link>

                  {secondaryCategories.length > 0 && (
                    <div className="border-t pt-3">
                      {secondaryCategories.slice(0, 3).map((category) => (
                        <Link
                          key={category.id}
                          href={category.slug ? `/categories/${category.slug}` : "/categories"}
                          className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          {category.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <nav className="hidden xl:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                  isActiveLink(link.href)
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Tìm kiếm"
            className="rounded-full"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="size-4" />
          </Button>

          {isLoggedIn && <HeaderCartSheet />}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Chuyển đổi giao diện"
            className="rounded-full"
          >
            <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            asChild
            className="hidden rounded-full lg:inline-flex"
            aria-label="Trung tâm hỗ trợ"
          >
            <Link href="/help">
              <CircleHelp className="size-4" />
            </Link>
          </Button>

          {isLoggedIn && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full"
                  aria-label="Menu người dùng"
                >
                  <Avatar className="size-9 border border-border/60">
                    <AvatarImage src={getAssetUrl(user.avatar)} alt={userDisplayName} />
                    <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userDisplayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {userEmail || "Khong co email"}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => router.push(dashboardPath)}
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
            <div className="hidden items-center gap-2 sm:flex">
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="rounded-full px-4 text-sm font-semibold"
              >
                <Link href="/login">
                  <LogIn className="size-4" />
                  Đăng nhập
                </Link>
              </Button>
              <Button
                size="sm"
                asChild
                className="rounded-full border-0 px-4 text-sm font-semibold text-white shadow-md"
                style={{
                  backgroundImage: "linear-gradient(90deg, #2f57ef, #b966e7)",
                }}
              >
                <Link href="/register">
                  <UserPlus className="size-4" />
                  Đăng ký
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
      <HeaderSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        categories={topCategories.map((item) => ({
          id: item.id,
          name: item.name,
          slug: item.slug,
        }))}
      />
    </header>
  );
}
