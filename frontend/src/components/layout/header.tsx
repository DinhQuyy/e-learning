"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Award,
  Bell,
  BookOpen,
  ChevronDown,
  GraduationCap,
  Heart,
  LayoutDashboard,
  LayoutGrid,
  LogIn,
  LogOut,
  Moon,
  PlusCircle,
  Search,
  ShoppingBag,
  Sun,
  TrendingUp,
  User,
  UserPlus,
} from "lucide-react";
import { useTheme } from "next-themes";

import { HeaderCartSheet } from "@/components/layout/header-cart-sheet";
import { HeaderSearchDialog } from "@/components/layout/header-search-dialog";
import { KognifyLogo } from "@/components/layout/logo";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiFetch } from "@/lib/api-fetch";
import { getAssetUrl } from "@/lib/directus";
import { getDashboardPath } from "@/lib/role-routing";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import type { DirectusUser } from "@/types";

interface HeaderCategory {
  id: string;
  name: string;
  slug: string;
  parent_id?: unknown;
}

const navLinks = [
  { href: "/courses", label: "Khóa học" },
  { href: "/become-instructor", label: "Trở thành giảng viên" },
  { href: "/help", label: "Hỗ trợ" },
];

const fallbackCategories: HeaderCategory[] = [
  { id: "kinh-doanh", name: "Kinh doanh", slug: "kinh-doanh" },
  { id: "lap-trinh", name: "Lập trình", slug: "lap-trinh" },
  { id: "ngoai-ngu", name: "Ngoại ngữ", slug: "ngoai-ngu" },
  {
    id: "phat-trien-ca-nhan",
    name: "Phát triển bản thân",
    slug: "phat-trien-ca-nhan",
  },
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
  if (fromName) return fromName.toUpperCase();
  if (email) return email.slice(0, 2).toUpperCase();
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

  if (fullName) return fullName;
  if (typeof user.email === "string" && user.email.trim().length > 0) {
    return user.email;
  }
  return "User";
}

function normalizeRoleName(
  role: DirectusUser["role"] | null | undefined
): string | null {
  if (!role) return null;

  if (typeof role === "object" && typeof role.name === "string") {
    const name = role.name.toLowerCase();
    return name === "administrator" ? "admin" : name;
  }

  if (typeof role === "string" && role.trim().length > 0) {
    const name = role.trim().toLowerCase();
    return name === "administrator" ? "admin" : name;
  }

  return null;
}

interface HeaderProps {
  initialUser?: DirectusUser | null;
}

export function Header({ initialUser = null }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [categories, setCategories] = useState<HeaderCategory[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);

  const user = useAuthStore((s) => s.user);
  const isAuthLoading = useAuthStore((s) => s.isLoading);
  const logout = useAuthStore((s) => s.logout);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    let alive = true;

    apiFetch("/api/categories")
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((json: { data?: HeaderCategory[] }) => {
        if (!alive) return;
        setCategories(Array.isArray(json.data) ? json.data : []);
      })
      .catch(() => {
        if (!alive) return;
        setCategories([]);
      });

    return () => {
      alive = false;
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/");
    router.refresh();
  };

  const activeUser = hydrated && !isAuthLoading ? user : initialUser;
  const role = normalizeRoleName(activeUser?.role);
  const isLoggedIn = Boolean(activeUser);
  const userInitials = activeUser ? getSafeInitials(activeUser) : "";
  const userDisplayName = activeUser ? getSafeDisplayName(activeUser) : "";
  const userEmail =
    activeUser &&
    typeof activeUser.email === "string" &&
    activeUser.email.trim().length > 0
      ? activeUser.email
      : "";
  const dashboardPath = getDashboardPath(role);
  const interactionReady = hydrated;

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

  const categoryButtonClass =
    "hidden h-10 rounded-full border-border/70 px-4 text-sm font-semibold lg:inline-flex";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:h-[84px] lg:px-8">
        <div className="flex items-center gap-2 lg:gap-6">
          <MobileNav isLoggedIn={isLoggedIn} dashboardPath={dashboardPath} />

          <Link href="/" className="rounded-xl pr-2" aria-label="Kognify - Trang chủ">
            <KognifyLogo />
          </Link>

          {interactionReady ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className={categoryButtonClass}>
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

                    {secondaryCategories.length > 0 ? (
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
                    ) : null}
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="outline" size="sm" asChild className={categoryButtonClass}>
              <Link href="/categories">
                <LayoutGrid className="size-4 text-[#2f57ef]" />
                Danh mục
              </Link>
            </Button>
          )}

          <nav className="hidden items-center gap-1 xl:flex">
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
            disabled={!interactionReady}
            onClick={() => setSearchOpen(true)}
          >
            <Search className="size-4" />
          </Button>

          {isLoggedIn ? <HeaderCartSheet /> : null}

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

          {isLoggedIn && activeUser ? (
            interactionReady ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-9 w-9 rounded-full"
                    aria-label="Menu người dùng"
                  >
                    <Avatar className="size-9 border border-border/60">
                      <AvatarImage
                        src={activeUser.avatar ? getAssetUrl(activeUser.avatar) : undefined}
                        alt={userDisplayName}
                      />
                      <AvatarFallback
                        className="text-xs font-bold text-white"
                        style={{ background: "linear-gradient(135deg, #2f57ef, #b966e7)" }}
                      >
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className={role === "admin" ? "w-56" : "w-64"}>
                  {/* User info */}
                  <div className="flex items-center gap-3 px-3 py-3">
                    <Avatar className="size-10 shrink-0 border border-border/60">
                      <AvatarImage src={activeUser.avatar ? getAssetUrl(activeUser.avatar) : undefined} alt={userDisplayName} />
                      <AvatarFallback
                        className="text-xs font-bold text-white"
                        style={{ background: "linear-gradient(135deg, #2f57ef, #b966e7)" }}
                      >
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold leading-none">{userDisplayName}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{userEmail || "Không có email"}</p>
                      <span className="mt-1 inline-block rounded-full bg-[#2f57ef]/10 px-2 py-0.5 text-[10px] font-semibold text-[#2f57ef]">
                        {role === "admin" ? "Quản trị viên" : role === "instructor" ? "Giảng viên" : "Học viên"}
                      </span>
                    </div>
                  </div>
                  <DropdownMenuSeparator />

                  {/* Student nav */}
                  {role === "student" && (
                    <>
                      <DropdownMenuItem onClick={() => router.push("/dashboard")} className="cursor-pointer gap-3 px-3 py-2">
                        <LayoutDashboard className="size-4 text-[#2f57ef]" />
                        Tổng quan
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push("/profile")} className="cursor-pointer gap-3 px-3 py-2">
                        <User className="size-4 text-slate-500" />
                        Hồ sơ
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push("/my-courses")} className="cursor-pointer gap-3 px-3 py-2">
                        <BookOpen className="size-4 text-slate-500" />
                        Khóa học của tôi
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push("/wishlist")} className="cursor-pointer gap-3 px-3 py-2">
                        <Heart className="size-4 text-slate-500" />
                        Yêu thích
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push("/my-certificates")} className="cursor-pointer gap-3 px-3 py-2">
                        <Award className="size-4 text-slate-500" />
                        Chứng chỉ
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push("/orders")} className="cursor-pointer gap-3 px-3 py-2">
                        <ShoppingBag className="size-4 text-slate-500" />
                        Đơn hàng
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push("/notifications")} className="cursor-pointer gap-3 px-3 py-2">
                        <Bell className="size-4 text-slate-500" />
                        Thông báo
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => router.push("/become-instructor")} className="cursor-pointer gap-3 px-3 py-2">
                        <GraduationCap className="size-4 text-[#b966e7]" />
                        <span className="text-[#b966e7] font-medium">Trở thành giảng viên</span>
                      </DropdownMenuItem>
                    </>
                  )}

                  {/* Instructor nav */}
                  {role === "instructor" && (
                    <>
                      <DropdownMenuItem onClick={() => router.push("/instructor/dashboard")} className="cursor-pointer gap-3 px-3 py-2">
                        <LayoutDashboard className="size-4 text-[#2f57ef]" />
                        Tổng quan
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push("/instructor/profile")} className="cursor-pointer gap-3 px-3 py-2">
                        <User className="size-4 text-slate-500" />
                        Hồ sơ
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push("/instructor/courses")} className="cursor-pointer gap-3 px-3 py-2">
                        <BookOpen className="size-4 text-slate-500" />
                        Quản lý khóa học
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push("/instructor/earnings")} className="cursor-pointer gap-3 px-3 py-2">
                        <TrendingUp className="size-4 text-slate-500" />
                        Doanh thu
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => router.push("/instructor/courses/new")} className="cursor-pointer gap-3 px-3 py-2">
                        <PlusCircle className="size-4 text-[#2f57ef]" />
                        <span className="font-medium text-[#2f57ef]">Tạo khóa học mới</span>
                      </DropdownMenuItem>
                    </>
                  )}

                  {/* Admin nav */}
                  {role === "admin" && (
                    <DropdownMenuItem onClick={() => router.push(dashboardPath)} className="cursor-pointer">
                      <LayoutDashboard className="size-4" />
                      Bảng điều khiển
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer gap-3 px-3 py-2" variant="destructive">
                    <LogOut className="size-4" />
                    Đăng xuất
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="ghost"
                asChild
                className="relative h-9 w-9 rounded-full"
              >
                <Link href={dashboardPath} aria-label="Menu người dùng">
                  <Avatar className="size-9 border border-border/60">
                    <AvatarImage
                      src={activeUser.avatar ? getAssetUrl(activeUser.avatar) : undefined}
                      alt={userDisplayName}
                    />
                    <AvatarFallback
                      className="text-xs font-bold text-white"
                      style={{ background: "linear-gradient(135deg, #2f57ef, #b966e7)" }}
                    >
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              </Button>
            )
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

      {interactionReady ? (
        <HeaderSearchDialog
          open={searchOpen}
          onOpenChange={setSearchOpen}
          categories={topCategories.map((item) => ({
            id: item.id,
            name: item.name,
            slug: item.slug,
          }))}
        />
      ) : null}
    </header>
  );
}
