"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MentorEmailPreferencesCard } from "@/components/features/mentor-email-preferences-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Save, Loader2, Camera } from "lucide-react";
import { apiFetch, apiPatch } from "@/lib/api-fetch";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface ProfileUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  avatar: string | null;
  headline: string | null;
  phone: string | null;
  bio: string | null;
  social_links: Record<string, string> | null;
  date_created: string | null;
  status: string;
  mentor_notification_email_enabled?: boolean | null;
  mentor_notification_email?: string | null;
  mentor_notification_email_verified?: boolean | null;
  mentor_notification_email_pending?: string | null;
  mentor_notification_email_verification_expires_at?: string | null;
}

interface InstructorProfileFormProps {
  user: ProfileUser;
  displayName: string;
  initials: string;
  avatarUrl: string;
}

export function InstructorProfileForm({
  user,
  displayName,
  initials,
  avatarUrl,
}: InstructorProfileFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(avatarUrl);

  const [formData, setFormData] = useState({
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    headline: user.headline || "",
    phone: user.phone || "",
    bio: user.bio || "",
    social_links: {
      website: user.social_links?.website || "",
      facebook: user.social_links?.facebook || "",
      linkedin: user.social_links?.linkedin || "",
      youtube: user.social_links?.youtube || "",
    },
  });

  const handleChange = (
    field: string,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSocialChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      social_links: { ...prev.social_links, [field]: value },
    }));
  };

  const handleAvatarUpload = async (file: File) => {
    setIsUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const uploadRes = await apiFetch("/api/upload", {
        method: "POST",
        body: fd,
      });

      if (!uploadRes.ok) throw new Error("Tải ảnh thất bại");

      const uploadData = await uploadRes.json();
      const fileId = uploadData.data?.id;

      if (!fileId) throw new Error("Không nhận được ID ảnh");

      // Update user avatar
      const res = await apiPatch("/api/auth/me", { avatar: fileId });

      if (!res.ok) throw new Error("Cập nhật ảnh thất bại");

      const directusUrl =
        process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://localhost:8055";
      setCurrentAvatarUrl(`${directusUrl}/assets/${fileId}`);
      toast.success("Đã cập nhật ảnh đại diện!");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Tải ảnh thất bại"
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      const socialLinks = Object.fromEntries(
        Object.entries(formData.social_links).filter(([, v]) => v.trim())
      );

      const payload = {
        first_name: formData.first_name || null,
        last_name: formData.last_name || null,
        headline: formData.headline || null,
        phone: formData.phone || null,
        bio: formData.bio || null,
        social_links: Object.keys(socialLinks).length > 0 ? socialLinks : null,
      };

      const res = await apiPatch("/api/auth/me", payload);

      if (!res.ok) throw new Error("Không thể cập nhật hồ sơ");

      toast.success("Đã lưu thay đổi!");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể lưu hồ sơ"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Thông tin cá nhân</CardTitle>
          <CardDescription>
            Thông tin hiển thị trên trang giảng viên
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="size-20">
                <AvatarImage src={currentAvatarUrl} alt={displayName} />
                <AvatarFallback className="text-xl">{initials}</AvatarFallback>
              </Avatar>
              <button
                type="button"
                className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
              >
                {isUploadingAvatar ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Camera className="size-3.5" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAvatarUpload(file);
                }}
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{displayName}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="default">{user.status}</Badge>
                {user.date_created && (
                  <span className="text-xs text-muted-foreground">
                    Tham gia{" "}
                    {format(new Date(user.date_created), "dd MMMM, yyyy", {
                      locale: vi,
                    })}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Form Fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">Họ</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleChange("first_name", e.target.value)}
                placeholder="Nguyễn"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Tên</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleChange("last_name", e.target.value)}
                placeholder="Văn A"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="headline">Tiêu đề chuyên môn</Label>
            <Input
              id="headline"
              value={formData.headline}
              onChange={(e) => handleChange("headline", e.target.value)}
              placeholder="VD: Giảng viên Lập trình Web"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Số điện thoại</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="0123 456 789"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Giới thiệu bản thân</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleChange("bio", e.target.value)}
              placeholder="Viết vài dòng giới thiệu về bạn..."
              rows={5}
            />
          </div>

          <Separator />

          {/* Social Links */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Liên kết mạng xã hội</Label>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.social_links.website}
                  onChange={(e) =>
                    handleSocialChange("website", e.target.value)
                  }
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook</Label>
                <Input
                  id="facebook"
                  value={formData.social_links.facebook}
                  onChange={(e) =>
                    handleSocialChange("facebook", e.target.value)
                  }
                  placeholder="https://facebook.com/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input
                  id="linkedin"
                  value={formData.social_links.linkedin}
                  onChange={(e) =>
                    handleSocialChange("linkedin", e.target.value)
                  }
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="youtube">YouTube</Label>
                <Input
                  id="youtube"
                  value={formData.social_links.youtube}
                  onChange={(e) =>
                    handleSocialChange("youtube", e.target.value)
                  }
                  placeholder="https://youtube.com/@..."
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              Lưu thay đổi
            </Button>
          </div>
        </CardContent>
      </Card>

      <MentorEmailPreferencesCard
        accountEmail={user.email}
        initialEnabled={user.mentor_notification_email_enabled}
        initialActiveNotificationEmail={user.mentor_notification_email}
        initialActiveNotificationEmailVerified={user.mentor_notification_email_verified}
        initialPendingNotificationEmail={user.mentor_notification_email_pending}
        initialPendingVerificationExpiresAt={
          user.mentor_notification_email_verification_expires_at
        }
      />
    </div>
  );
}
