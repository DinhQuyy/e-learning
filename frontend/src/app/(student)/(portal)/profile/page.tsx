"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useAuthStore } from "@/stores/auth-store";
import { getAssetUrl } from "@/lib/directus";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Upload, Save, KeyRound, User } from "lucide-react";
import { toast } from "sonner";
import Cropper, { Area } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiFetch, apiPatch } from "@/lib/api-fetch";

const profileSchema = z.object({
  first_name: z.string().min(1, "Vui lòng nhập tên"),
  last_name: z.string().min(1, "Vui lòng nhập họ"),
  phone: z.string().optional(),
  bio: z.string().optional(),
  headline: z.string().optional(),
  social_links: z.object({
    facebook: z.string().optional(),
    linkedin: z.string().optional(),
    twitter: z.string().optional(),
    website: z.string().optional(),
  }).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
    new_password: z.string().min(8, "Mật khẩu mới tối thiểu 8 ký tự"),
    confirm_password: z.string().min(1, "Vui lòng xác nhận mật khẩu"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirm_password"],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { user } = useAuth();
  const { fetchUser } = useAuthStore();
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropFileName, setCropFileName] = useState("avatar.png");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isSubmitting: isProfileSubmitting },
    reset: resetProfile,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
    reset: resetPassword,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  // Populate form when user data is available
  useEffect(() => {
    if (user) {
      resetProfile({
        first_name: user.first_name ?? "",
        last_name: user.last_name ?? "",
        phone: user.phone ?? "",
        bio: user.bio ?? "",
        headline: user.headline ?? "",
        social_links: {
          facebook: user.social_links?.facebook ?? "",
          linkedin: user.social_links?.linkedin ?? "",
          twitter: user.social_links?.twitter ?? "",
          website: user.social_links?.website ?? "",
        },
      });
    }
  }, [user, resetProfile]);

  useEffect(() => {
    return () => {
      if (cropSrc) URL.revokeObjectURL(cropSrc);
    };
  }, [cropSrc]);

  const onProfileSubmit = async (data: ProfileFormData) => {
    try {
      const res = await apiPatch("/api/auth/me", {
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone || null,
          bio: data.bio || null,
          headline: data.headline || null,
          social_links: data.social_links || null,
        });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Lỗi cập nhật hồ sơ");
      }

      await fetchUser();
      toast.success("Hồ sơ đã được cập nhật");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Lỗi cập nhật hồ sơ"
      );
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    try {
      const res = await apiPatch("/api/auth/password", {
          current_password: data.current_password,
          new_password: data.new_password,
        });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Lỗi đổi mật khẩu");
      }

      resetPassword();
      toast.success("Mật khẩu đã được thay đổi");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Lỗi đổi mật khẩu"
      );
    }
  };



  const validateAvatarFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file ảnh");
      return false;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Kích thước ảnh tối đa 5MB");
      return false;
    }

    return true;
  };

  const clearAvatarInput = () => {
    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }
  };

  const resetCropState = () => {
    if (cropSrc) {
      URL.revokeObjectURL(cropSrc);
    }
    setIsCropOpen(false);
    setCropSrc(null);
    setCropFileName("avatar.png");
    setCroppedAreaPixels(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    clearAvatarInput();
  };

  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const getCroppedAvatarFile = async (): Promise<File | null> => {
    if (!cropSrc || !croppedAreaPixels) return null;

    const image = await loadImage(cropSrc);
    const canvas = document.createElement("canvas");
    const width = Math.round(croppedAreaPixels.width);
    const height = Math.round(croppedAreaPixels.height);
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      width,
      height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Không thể xử lý ảnh"));
          const file = new File(
            [blob],
            cropFileName ? `avatar-${cropFileName}` : "avatar-cropped.png",
            { type: blob.type }
          );
          resolve(file);
        },
        "image/png",
        0.95
      );
    });
  };

  const handleAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!validateAvatarFile(file)) {
      clearAvatarInput();
      return;
    }

    const src = URL.createObjectURL(file);
    setCropSrc(src);
    setCropFileName(file.name || "avatar.png");
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setIsCropOpen(true);
  };

  const uploadAvatarFile = async (file: File): Promise<boolean> => {
    if (!validateAvatarFile(file)) return false;

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await apiFetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error("Lỗi tải ảnh lên");
      }

      const uploadData = await uploadRes.json();
      const fileId = uploadData.data?.id;

      if (!fileId) {
        throw new Error("Không nhận được file ID");
      }

      const updateRes = await apiPatch("/api/auth/me", { avatar: fileId });

      if (!updateRes.ok) {
        throw new Error("Lỗi cập nhật ảnh đại diện");
      }

      await fetchUser();
      toast.success("Ảnh đại diện đã được cập nhật");
      return true;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Lỗi tải ảnh"
      );
      return false;
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleAvatarCropConfirm = async () => {
    try {
      const croppedFile = await getCroppedAvatarFile();
      if (!croppedFile) {
        toast.error("Không thể xử lý ảnh đã crop");
        return;
      }

      const success = await uploadAvatarFile(croppedFile);
      if (success) {
        resetCropState();
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể crop ảnh"
      );
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const initials = [user.first_name?.[0], user.last_name?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase() || user.email?.[0]?.toUpperCase() || "U";

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hồ sơ</h1>
        <p className="text-muted-foreground">
          Quản lý thông tin cá nhân của bạn
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tro thanh giang vien</CardTitle>
          <CardDescription>
            Nop ho so de duoc xet duyet quyen Instructor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/become-instructor">Mo trang dang ky giang vien</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Avatar Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="size-5" />
            Ảnh đại diện
          </CardTitle>
          <CardDescription>
            Ảnh đại diện sẽ hiển thị trong hồ sơ và bình luận
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <Avatar className="size-20">
            <AvatarImage src={getAssetUrl(user.avatar)} alt="Avatar" />
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <Label htmlFor="avatar-upload" className="cursor-pointer">
              <div className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
                {isUploadingAvatar ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                {isUploadingAvatar ? "Đang tải lên..." : "Tải ảnh mới"}
              </div>
            </Label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarSelect}
              disabled={isUploadingAvatar}
              ref={avatarInputRef}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              JPG, PNG hoặc GIF. Tối đa 5MB.
            </p>
          </div>
        </CardContent>

      </Card>

      <Dialog
        open={isCropOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetCropState();
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cắt ảnh đại diện</DialogTitle>
          </DialogHeader>
          <div className="relative w-full aspect-square bg-muted rounded-md overflow-hidden">
            {cropSrc && (
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
                objectFit="cover"
                showGrid={false}
              />
            )}
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-sm text-muted-foreground w-20">Zoom</Label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-12 text-right">
              {zoom.toFixed(1)}x
            </span>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={resetCropState}
              disabled={isUploadingAvatar}
            >
              Hủy
            </Button>
            <Button
              onClick={handleAvatarCropConfirm}
              disabled={isUploadingAvatar}
              className="gap-2"
            >
              {isUploadingAvatar ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {isUploadingAvatar ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Form */}

      <Card>
        <CardHeader>
          <CardTitle>Thông tin cá nhân</CardTitle>
          <CardDescription>
            Cập nhật thông tin hồ sơ cá nhân của bạn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleProfileSubmit(onProfileSubmit)}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">Tên</Label>
                <Input
                  id="first_name"
                  {...registerProfile("first_name")}
                  placeholder="Tên"
                />
                {profileErrors.first_name && (
                  <p className="text-xs text-destructive">
                    {profileErrors.first_name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Họ</Label>
                <Input
                  id="last_name"
                  {...registerProfile("last_name")}
                  placeholder="Họ"
                />
                {profileErrors.last_name && (
                  <p className="text-xs text-destructive">
                    {profileErrors.last_name.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email không thể thay đổi
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input
                id="phone"
                {...registerProfile("phone")}
                placeholder="0912 345 678"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="headline">Tiêu đề</Label>
              <Input
                id="headline"
                {...registerProfile("headline")}
                placeholder="VD: Lập trình viên Full-stack"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Giới thiệu bản thân</Label>
              <Textarea
                id="bio"
                {...registerProfile("bio")}
                placeholder="Viết vài dòng về bản thân..."
                rows={4}
              />
            </div>

            <Separator />

            <h3 className="text-sm font-medium">Mạng xã hội</h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook</Label>
                <Input
                  id="facebook"
                  {...registerProfile("social_links.facebook")}
                  placeholder="https://facebook.com/username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input
                  id="linkedin"
                  {...registerProfile("social_links.linkedin")}
                  placeholder="https://linkedin.com/in/username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitter">Twitter</Label>
                <Input
                  id="twitter"
                  {...registerProfile("social_links.twitter")}
                  placeholder="https://twitter.com/username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  {...registerProfile("social_links.website")}
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isProfileSubmitting}
                className="gap-2"
              >
                {isProfileSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Lưu thông tin
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-5" />
            Đổi mật khẩu
          </CardTitle>
          <CardDescription>
            Đảm bảo tài khoản của bạn luôn an toàn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handlePasswordSubmit(onPasswordSubmit)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="current_password">Mật khẩu hiện tại</Label>
              <Input
                id="current_password"
                type="password"
                {...registerPassword("current_password")}
                placeholder="Nhập mật khẩu hiện tại"
              />
              {passwordErrors.current_password && (
                <p className="text-xs text-destructive">
                  {passwordErrors.current_password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_password">Mật khẩu mới</Label>
              <Input
                id="new_password"
                type="password"
                {...registerPassword("new_password")}
                placeholder="Nhập mật khẩu mới"
              />
              {passwordErrors.new_password && (
                <p className="text-xs text-destructive">
                  {passwordErrors.new_password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">Xác nhận mật khẩu mới</Label>
              <Input
                id="confirm_password"
                type="password"
                {...registerPassword("confirm_password")}
                placeholder="Nhập lại mật khẩu mới"
              />
              {passwordErrors.confirm_password && (
                <p className="text-xs text-destructive">
                  {passwordErrors.confirm_password.message}
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="outline"
                disabled={isPasswordSubmitting}
                className="gap-2"
              >
                {isPasswordSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <KeyRound className="size-4" />
                )}
                Đổi mật khẩu
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
