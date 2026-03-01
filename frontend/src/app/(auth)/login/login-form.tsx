"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/auth-store";
import { apiFetch } from "@/lib/api-fetch";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Vui lòng nhập email")
    .email("Email không hợp lệ"),
  password: z
    .string()
    .min(1, "Vui lòng nhập mật khẩu"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function getDefaultRedirect(role: string): string {
    switch (role) {
      case "admin":
        return "/admin/dashboard";
      case "instructor":
        return "/instructor/dashboard";
      default:
        return "/dashboard";
    }
  }

  async function onSubmit(data: LoginFormValues) {
    try {
      setIsSubmitting(true);
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, password: data.password }),
        skipRetry: true,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Đăng nhập thất bại");
      }

      const loginData = await res.json();
      const role: string = loginData.user?.role || "student";

      // Fetch user profile into store
      const meRes = await apiFetch("/api/auth/me", { skipRetry: true });
      if (meRes.ok) {
        const meData = await meRes.json();
        useAuthStore.getState().setUser(meData.user);
      }

      toast.success("Đăng nhập thành công!");

      // Use explicit redirect param if set, otherwise redirect by role
      const explicit = searchParams.get("redirect");
      router.push(explicit || getDefaultRedirect(role));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Đăng nhập thất bại";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Đăng nhập</CardTitle>
        <CardDescription>
          Nhập thông tin tài khoản để tiếp tục
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@example.com"
              autoComplete="email"
              disabled={isSubmitting}
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Mật khẩu</Label>
              <Link
                href="/forgot-password"
                className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                Quên mật khẩu?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Nhập mật khẩu"
              autoComplete="current-password"
              disabled={isSubmitting}
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <LogIn />
            )}
            {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Chưa có tài khoản?{" "}
          <Link
            href="/register"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Đăng ký ngay
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
