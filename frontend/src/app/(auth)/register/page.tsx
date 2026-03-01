"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";

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
    first_name: z
      .string()
      .min(1, "Vui lòng nhập họ"),
    last_name: z
      .string()
      .min(1, "Vui lòng nhập tên"),
    email: z
      .string()
      .min(1, "Vui lòng nhập email")
      .email("Email không hợp lệ"),
    password: z
      .string()
      .min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
    confirm_password: z
      .string()
      .min(1, "Vui lòng xác nhận mật khẩu"),
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
      const message =
        error instanceof Error ? error.message : "Đăng ký thất bại";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Đăng ký tài khoản</CardTitle>
        <CardDescription>
          Tạo tài khoản mới để bắt đầu học tập
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="first_name">Họ</Label>
              <Input
                id="first_name"
                placeholder="Nguyễn"
                autoComplete="family-name"
                disabled={isSubmitting}
                aria-invalid={!!errors.first_name}
                {...register("first_name")}
              />
              {errors.first_name && (
                <p className="text-sm text-destructive">
                  {errors.first_name.message}
                </p>
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
                {...register("last_name")}
              />
              {errors.last_name && (
                <p className="text-sm text-destructive">
                  {errors.last_name.message}
                </p>
              )}
            </div>
          </div>

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
            <Label htmlFor="password">Mật khẩu</Label>
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
            <Label htmlFor="confirm_password">Xác nhận mật khẩu</Label>
            <Input
              id="confirm_password"
              type="password"
              placeholder="Nhập lại mật khẩu"
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

          <div className="grid gap-2">
            <Label htmlFor="role">Vai trò</Label>
            <Select
              value={selectedRole}
              onValueChange={(value: "student" | "instructor") =>
                setValue("role", value, { shouldValidate: true })
              }
              disabled={isSubmitting}
            >
              <SelectTrigger id="role" className="w-full">
                <SelectValue placeholder="Chọn vai trò" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Học viên</SelectItem>
                <SelectItem value="instructor">Giảng viên</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-sm text-destructive">
                {errors.role.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <UserPlus />
            )}
            {isSubmitting ? "Đang đăng ký..." : "Đăng ký"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Đã có tài khoản?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Đăng nhập
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
