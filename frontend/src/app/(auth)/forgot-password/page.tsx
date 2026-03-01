"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Mail } from "lucide-react";

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

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Vui lòng nhập email")
    .email("Email không hợp lệ"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(data: ForgotPasswordFormValues) {
    try {
      setIsSubmitting(true);
      const res = await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
        skipRetry: true,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gửi yêu cầu thất bại");
      }

      setIsSubmitted(true);
      toast.success("Vui lòng kiểm tra email của bạn!");
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

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Quên mật khẩu</CardTitle>
        <CardDescription>
          Nhập email của bạn để nhận liên kết đặt lại mật khẩu
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isSubmitted ? (
          <div className="grid gap-4 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
              <Mail className="size-6 text-primary" />
            </div>
            <div className="grid gap-2">
              <p className="text-sm font-medium">Email đã được gửi!</p>
              <p className="text-sm text-muted-foreground">
                Nếu tài khoản với email này tồn tại, bạn sẽ nhận được liên
                kết để đặt lại mật khẩu. Vui lòng kiểm tra hộp thư đến và
                thư rác.
              </p>
            </div>
            <Button variant="outline" asChild className="w-full">
              <Link href="/login">
                <ArrowLeft />
                Quay lại đăng nhập
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="grid gap-4"
            >
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

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Mail />
                )}
                {isSubmitting
                  ? "Đang gửi..."
                  : "Gửi liên kết đặt lại mật khẩu"}
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
