"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Save, Loader2, Server, Mail, Wrench, Info } from "lucide-react";
import { apiFetch, apiPatch } from "@/lib/api-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";

const settingsSchema = z.object({
  platform_name: z.string().min(1, "Tên nền tảng là bắt buộc"),
  platform_description: z.string().optional(),
  maintenance_mode: z.boolean(),
  maintenance_message: z.string().optional(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function AdminSettingsPage() {
  const [saving, setSaving] = useState(false);

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      platform_name: "Kognify",
      platform_description:
        "Nền tảng học trực tuyến hàng đầu Việt Nam",
      maintenance_mode: false,
      maintenance_message:
        "Hệ thống đang bảo trì. Vui lòng quay lại sau.",
    },
  });

  useEffect(() => {
    apiFetch("/api/admin/settings")
      .then((res) => res.ok ? res.json() : null)
      .then((json) => {
        if (json?.data) {
          form.reset({
            platform_name: json.data.platform_name || "Kognify",
            platform_description: json.data.platform_description || "",
            maintenance_mode: json.data.maintenance_mode || false,
            maintenance_message: json.data.maintenance_message || "",
          });
        }
      })
      .catch(() => {});
  }, [form]);

  const handleSubmit = async (data: SettingsFormData) => {
    setSaving(true);
    try {
      const res = await apiPatch("/api/admin/settings", data);
      if (!res.ok) throw new Error();
      toast.success("Đã lưu cài đặt thành công");
    } catch {
      toast.error("Có lỗi xảy ra khi lưu cài đặt");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Cài đặt hệ thống
        </h1>
        <p className="text-gray-500">
          Cấu hình và tuỳ chỉnh nền tảng học trực tuyến
        </p>
      </div>

      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Platform Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Thông tin nền tảng
            </CardTitle>
            <CardDescription>
              Cấu hình thông tin cơ bản của nền tảng
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="platform_name">
                Tên nền tảng *
              </Label>
              <Input
                id="platform_name"
                {...form.register("platform_name")}
                placeholder="Ví dụ: Kognify"
              />
              {form.formState.errors.platform_name && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.platform_name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="platform_description">
                Mô tả nền tảng
              </Label>
              <Textarea
                id="platform_description"
                {...form.register("platform_description")}
                placeholder="Mô tả ngắn về nền tảng..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg border bg-gray-50">
                  <Server className="h-8 w-8 text-gray-500" />
                </div>
                <div>
                  <Button type="button" variant="outline" size="sm">
                    Tải lên logo
                  </Button>
                  <p className="mt-1 text-xs text-gray-500">
                    PNG, JPG, SVG. Tối đa 2MB.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Cấu hình Email
            </CardTitle>
            <CardDescription>
              Cài đặt SMTP cho việc gửi email thông báo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Cấu hình qua Directus
                  </p>
                  <p className="mt-1 text-sm text-blue-700">
                    Cài đặt SMTP được quản lý trực tiếp trong Directus Admin.
                    Truy cập{" "}
                    <span className="font-mono">
                      Settings &gt; Project Settings &gt; Email
                    </span>{" "}
                    để cấu hình.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>SMTP Host</Label>
                <Input disabled value="Được cấu hình trong Directus" />
              </div>
              <div className="space-y-2">
                <Label>SMTP Port</Label>
                <Input disabled value="---" />
              </div>
              <div className="space-y-2">
                <Label>Email gửi</Label>
                <Input disabled value="Được cấu hình trong Directus" />
              </div>
              <div className="space-y-2">
                <Label>Trạng thái</Label>
                <div className="flex h-9 items-center">
                  <Badge className="bg-gray-100 text-gray-700">
                    Xem trong Directus Admin
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Maintenance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Bảo trì
            </CardTitle>
            <CardDescription>
              Quản lý chế độ bảo trì của hệ thống
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Checkbox
                id="maintenance_mode"
                checked={form.watch("maintenance_mode")}
                onCheckedChange={(checked) =>
                  form.setValue("maintenance_mode", !!checked)
                }
              />
              <div>
                <Label htmlFor="maintenance_mode" className="cursor-pointer">
                  Bật chế độ bảo trì
                </Label>
                <p className="text-xs text-gray-500">
                  Khi bật, người dùng sẽ thấy thông báo bảo trì thay vì trang chủ
                </p>
              </div>
            </div>

            {form.watch("maintenance_mode") && (
              <div className="space-y-2">
                <Label htmlFor="maintenance_message">
                  Thông báo bảo trì
                </Label>
                <Textarea
                  id="maintenance_message"
                  {...form.register("maintenance_message")}
                  placeholder="Nhập thông báo hiển thị cho người dùng..."
                  rows={3}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* Save */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Một số cài đặt nâng cao được quản lý qua{" "}
            <span className="font-medium">Directus Admin UI</span>.
          </p>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Lưu cài đặt
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
