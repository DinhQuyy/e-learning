"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Lock, LogIn, Mail } from "lucide-react";

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
import { getPostLoginPath } from "@/lib/role-routing";

const loginSchema = z.object({
  email: z.string().min(1, "Vui lòng nhập email").email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
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

      const meRes = await apiFetch("/api/auth/me", { skipRetry: true });
      if (meRes.ok) {
        const meData = await meRes.json();
        useAuthStore.getState().setUser(meData.user);
      }

      toast.success("Đăng nhập thành công");

      const explicit = searchParams.get("redirect");
      router.push(explicit || getPostLoginPath(role));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Đăng nhập thất bại";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="overflow-hidden rounded-3xl border border-border/70 bg-background/95 shadow-xl">
      <CardHeader className="space-y-2 border-b bg-gradient-to-r from-[#eef3ff] to-[#f6efff] px-6 py-6 text-left">
        <p className="inline-flex w-fit rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#2f57ef]">
          Chào mừng trở lại
        </p>
        <CardTitle className="text-2xl font-bold">Đăng nhập</CardTitle>
        <CardDescription>
          Nhập thông tin tài khoản để tiếp tục hành trình học tập của bạn.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-6 py-6">
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                autoComplete="email"
                disabled={isSubmitting}
                aria-invalid={!!errors.email}
                className="h-11 rounded-xl pl-10"
                {...register("email")}
              />
            </div>
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Mật khẩu</Label>
              <Link href="/forgot-password" className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline">
                Quên mật khẩu?
              </Link>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Nhập mật khẩu"
                autoComplete="current-password"
                disabled={isSubmitting}
                aria-invalid={!!errors.password}
                className="h-11 rounded-xl pl-10"
                {...register("password")}
              />
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="mt-1 h-11 rounded-xl border-0 text-white"
            style={{ backgroundImage: "linear-gradient(90deg, #2f57ef, #b966e7)" }}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
            {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </Button>
        </form>

        <div className="mt-6 rounded-xl border bg-accent/40 p-3 text-sm">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="font-semibold text-[#2f57ef] hover:underline">
            Đăng ký ngay
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
