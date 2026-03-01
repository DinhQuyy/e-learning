"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface LogoutButtonProps {
  variant?: "ghost" | "default" | "outline" | "destructive";
  showLabel?: boolean;
  className?: string;
}

export function LogoutButton({
  variant = "ghost",
  showLabel = false,
  className,
}: LogoutButtonProps) {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
    router.refresh();
  };

  return (
    <Button
      variant={variant}
      size={showLabel ? "sm" : "icon"}
      onClick={handleLogout}
      className={className}
    >
      <LogOut className="size-4" />
      {showLabel && <span>Đăng xuất</span>}
      {!showLabel && <span className="sr-only">Đăng xuất</span>}
    </Button>
  );
}
