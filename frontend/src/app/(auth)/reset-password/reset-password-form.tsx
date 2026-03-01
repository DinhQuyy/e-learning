"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, Loader2 } from "lucide-react";

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
import { apiFetch } from "@/lib/api-fetch";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
    confirm_password: z
      .string()
      .min(1, "Vui lòng xác nhận mật khẩu"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirm_password"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirm_password: "",
    },
  });

  async function onSubmit(data: ResetPasswordFormValues) {
    if (!token) {
      toast.error("Liên kết đặt lại mật khẩu không hợp lệ.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await apiFetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
        skipRetry: true,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(
          errData.error || "Đặt lại mật khẩu thất bại"
        );
      }

      toast.success(
        "Mật khẩu đã được đặt lại thành công! Vui lòng đăng nhập."
      );
      router.push("/login");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Đã xảy ra lỗi, vui lòng thử lại";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Liên kết không hợp lệ</CardTitle>
          <CardDescription>
            Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild className="w-full">
            <Link href="/forgot-password">
              <ArrowLeft />
              Yêu cầu liên kết mới
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Đặt lại mật khẩu</CardTitle>
        <CardDescription>Nhập mật khẩu mới cho tài khoản của bạn</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="password">Mật khẩu mới</Label>
            <Input
              id="password"
              type="password"
              placeholder="Ít nhất 8 ký tự"
              autoComplete="new-password"
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

          <div className="grid gap-2">
            <Label htmlFor="confirm_password">Xác nhận mật khẩu mới</Label>
            <Input
              id="confirm_password"
              type="password"
              placeholder="Nhập lại mật khẩu mới"
              autoComplete="new-password"
              disabled={isSubmitting}
              aria-invalid={!!errors.confirm_password}
              {...register("confirm_password")}
            />
            {errors.confirm_password && (
              <p className="text-sm text-destructive">
                {errors.confirm_password.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <KeyRound />
            )}
            {isSubmitting ? "Đang xử lý..." : "Đặt lại mật khẩu"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <Link
            href="/login"
            className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline"
          >
            <ArrowLeft className="size-3" />
            Quay lại đăng nhập
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
