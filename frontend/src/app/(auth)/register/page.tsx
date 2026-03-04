"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Mail, Shield, User, UserPlus } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/stores/auth-store";

const registerSchema = z
  .object({
    first_name: z.string().min(1, "Vui lòng nhập họ"),
    last_name: z.string().min(1, "Vui lòng nhập tên"),
    email: z.string().min(1, "Vui lòng nhập email").email("Email không hợp lệ"),
    password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
    confirm_password: z.string().min(1, "Vui lòng xác nhận mật khẩu"),
    role: z.enum(["student", "instructor"], {
      message: "Vui lòng chọn vai trò",
    }),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirm_password"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const registerUser = useAuthStore((s) => s.register);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      confirm_password: "",
      role: "student",
    },
  });

  const selectedRole = watch("role");

  async function onSubmit(data: RegisterFormValues) {
    try {
      setIsSubmitting(true);
      await registerUser({
        email: data.email,
        password: data.password,
        first_name: data.first_name,
        last_name: data.last_name,
        role: data.role,
      });
      toast.success("Đăng ký thành công! Vui lòng đăng nhập.");
      router.push("/login");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Đăng ký thất bại";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="overflow-hidden rounded-3xl border border-border/70 bg-background/95 shadow-xl">
      <CardHeader className="space-y-2 border-b bg-gradient-to-r from-[#eef3ff] to-[#f6efff] px-6 py-6 text-left">
        <p className="inline-flex w-fit rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#2f57ef]">
          Bắt đầu học tập ngay hôm nay
        </p>
        <CardTitle className="text-2xl font-bold">Đăng ký tài khoản</CardTitle>
        <CardDescription>Tạo tài khoản mới để truy cập kho khóa học và lộ trình riêng.</CardDescription>
      </CardHeader>

      <CardContent className="px-6 py-6">
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="first_name">Họ</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="first_name"
                  placeholder="Nguyễn"
                  autoComplete="family-name"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.first_name}
                  className="h-11 rounded-xl pl-10"
                  {...register("first_name")}
                />
              </div>
              {errors.first_name && (
                <p className="text-sm text-destructive">{errors.first_name.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="last_name">Tên</Label>
              <Input
                id="last_name"
                placeholder="Văn A"
                autoComplete="given-name"
                disabled={isSubmitting}
                aria-invalid={!!errors.last_name}
                className="h-11 rounded-xl"
                {...register("last_name")}
              />
              {errors.last_name && (
                <p className="text-sm text-destructive">{errors.last_name.message}</p>
              )}
            </div>
          </div>

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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                placeholder="Ít nhất 8 ký tự"
                autoComplete="new-password"
                disabled={isSubmitting}
                aria-invalid={!!errors.password}
                className="h-11 rounded-xl"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirm_password">Xác nhận mật khẩu</Label>
              <Input
                id="confirm_password"
                type="password"
                placeholder="Nhập lại mật khẩu"
                autoComplete="new-password"
                disabled={isSubmitting}
                aria-invalid={!!errors.confirm_password}
                className="h-11 rounded-xl"
                {...register("confirm_password")}
              />
              {errors.confirm_password && (
                <p className="text-sm text-destructive">{errors.confirm_password.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="role">Vai trò</Label>
            <Select
              value={selectedRole}
              onValueChange={(value: "student" | "instructor") =>
                setValue("role", value, { shouldValidate: true })
              }
              disabled={isSubmitting}
            >
              <SelectTrigger id="role" className="h-11 rounded-xl">
                <SelectValue placeholder="Chọn vai trò" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Học viên</SelectItem>
                <SelectItem value="instructor">Giảng viên</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && <p className="text-sm text-destructive">{errors.role.message}</p>}
          </div>

          <Button
            type="submit"
            className="h-11 rounded-xl border-0 text-white"
            style={{ backgroundImage: "linear-gradient(90deg, #2f57ef, #b966e7)" }}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
            {isSubmitting ? "Đang đăng ký..." : "Đăng ký"}
          </Button>
        </form>

        <div className="mt-6 rounded-xl border bg-accent/40 p-3 text-sm">
          <p className="inline-flex items-center gap-1 font-medium">
            <Shield className="size-4 text-[#2f57ef]" />
            Bạn đã có tài khoản?{" "}
            <Link href="/login" className="font-semibold text-[#2f57ef] hover:underline">
              Đăng nhập
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
