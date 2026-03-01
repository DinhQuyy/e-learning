"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Save,
  Send,
  Undo2,
  Plus,
  X,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { MediaUploader } from "@/components/features/media-uploader";
import { apiFetch, apiPatch } from "@/lib/api-fetch";
import type { Course } from "@/types";

const courseSchema = z.object({
  title: z.string().min(5, "Tiêu đề phải có ít nhất 5 ký tự"),
  slug: z.string().min(3, "Slug phải có ít nhất 3 ký tự"),
  description: z.string().min(20, "Mô tả phải có ít nhất 20 ký tự"),
  content: z.string().optional(),
  category_id: z.string().optional(),
  level: z.string().min(1, "Vui lòng chọn trình độ"),
  language: z.string().min(1, "Vui lòng chọn ngôn ngữ"),
  promo_video_url: z
    .string()
    .url("URL không hợp lệ")
    .optional()
    .or(z.literal("")),
  price: z.number().min(0, "Giá không được âm"),
  discount_price: z
    .number()
    .min(0, "Giá giảm không được âm")
    .optional()
    .or(z.literal(0)),
  thumbnail: z.string().optional(),
  requirements: z.array(z.object({ value: z.string() })),
  what_you_learn: z.array(z.object({ value: z.string() })),
  target_audience: z.array(z.object({ value: z.string() })),
});

type FormData = z.infer<typeof courseSchema>;

const levels = [
  { value: "beginner", label: "Người mới bắt đầu" },
  { value: "intermediate", label: "Trung cấp" },
  { value: "advanced", label: "Nâng cao" },
  { value: "all_levels", label: "Tất cả trình độ" },
];

const languages = [
  { value: "Tiếng Việt", label: "Tiếng Việt" },
  { value: "English", label: "English" },
];

const statusMap: Record<string, string> = {
  draft: "Bản nháp",
  review: "Chờ duyệt",
  published: "Đã xuất bản",
  archived: "Đã lưu trữ",
};

const getAssetId = (value: string | null | undefined): string | null => {
  if (!value) return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    return value;
  }
  const match =
    value.match(/\/assets\/([0-9a-f-]{36})/i) ||
    value.match(/\/api\/assets\/([0-9a-f-]{36})/i);
  if (match?.[1]) return match[1];
  return null;
};

export default function EditCoursePage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [categories, setCategories] = useState<
    { id: number; name: string }[]
  >([]);

  const form = useForm<FormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: "",
      slug: "",
      description: "",
      content: "",
      category_id: "",
      level: "all_levels",
      language: "Tiếng Việt",
      promo_video_url: "",
      price: 0,
      discount_price: 0,
      requirements: [{ value: "" }],
      what_you_learn: [{ value: "" }],
      target_audience: [{ value: "" }],
      thumbnail: "",
    },
  });

  const {
    register,
    setValue,
    watch,
    handleSubmit,
    reset,
    formState: { errors },
  } = form;

  const requirementsField = useFieldArray({
    control: form.control,
    name: "requirements",
  });

  const whatYouLearnField = useFieldArray({
    control: form.control,
    name: "what_you_learn",
  });

  const targetAudienceField = useFieldArray({
    control: form.control,
    name: "target_audience",
  });

  const loadCourse = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/instructor/courses/${courseId}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      const c: Course = data.data;
      setCourse(c);

      const categoryId =
        typeof c.category_id === "object" && c.category_id
          ? String(c.category_id.id)
          : c.category_id
            ? String(c.category_id)
            : "";

      let thumbnailValue = "";
      if (typeof c.thumbnail === "string") {
        thumbnailValue = c.thumbnail;
      } else if (c.thumbnail && typeof (c.thumbnail as { id?: string }).id === "string") {
        thumbnailValue = (c.thumbnail as { id: string }).id;
      }
      const normalizedThumbnail = thumbnailValue
        ? `/api/assets/${thumbnailValue}`
        : "";

      reset({
        title: c.title,
        slug: c.slug,
        description: c.description || "",
        content: c.content || "",
        category_id: categoryId,
        level: c.level,
        language: c.language,
        promo_video_url: c.promo_video_url || "",
        price: c.price,
        discount_price: c.discount_price ?? 0,
        thumbnail: normalizedThumbnail,
        requirements:
          c.requirements && c.requirements.length > 0
            ? c.requirements.map((r) => ({ value: r }))
            : [{ value: "" }],
        what_you_learn:
          c.what_you_learn && c.what_you_learn.length > 0
            ? c.what_you_learn.map((o) => ({ value: o }))
            : [{ value: "" }],
        target_audience:
          c.target_audience && c.target_audience.length > 0
            ? c.target_audience.map((t) => ({ value: t }))
            : [{ value: "" }],
      });
    } catch {
      toast.error("Không thể tải thông tin khoá học");
      router.push("/instructor/courses");
    } finally {
      setIsLoading(false);
    }
  }, [courseId, reset, router]);

  useEffect(() => {
    loadCourse();

    // Load categories
    apiFetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.data ?? []))
      .catch(() => setCategories([]));
  }, [loadCourse]);

  const onSave = async (data: FormData) => {
    setIsSaving(true);
    try {
      const payload = {
        title: data.title,
        slug: data.slug,
        description: data.description,
        content: data.content || null,
        category_id: data.category_id || null,
        level: data.level,
        language: data.language,
        price: data.price,
        discount_price: data.discount_price || null,
        thumbnail: getAssetId(data.thumbnail) || null,
        promo_video_url: data.promo_video_url || null,
        requirements: data.requirements
          .map((r) => r.value)
          .filter((v) => v.trim() !== ""),
        what_you_learn: data.what_you_learn
          .map((o) => o.value)
          .filter((v) => v.trim() !== ""),
        target_audience: data.target_audience
          .map((t) => t.value)
          .filter((v) => v.trim() !== ""),
      };

      const res = await apiPatch(`/api/instructor/courses/${courseId}`, payload);

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Không thể lưu");
      }

      toast.success("Đã lưu thay đổi!");
      loadCourse();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể lưu thay đổi"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const newStatus = course?.status === "published" ? "draft" : "review";
      const res = await apiPatch(`/api/instructor/courses/${courseId}`, { status: newStatus });

      if (!res.ok) throw new Error("Không thể thay đổi trạng thái");

      toast.success(
        newStatus === "review"
          ? "Đã gửi khoá học để duyệt!"
          : "Đã chuyển về bản nháp!"
      );
      loadCourse();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể thay đổi trạng thái"
      );
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/instructor/courses">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                Chỉnh sửa khoá học
              </h1>
              <Badge
                variant={
                  course.status === "published"
                    ? "default"
                    : course.status === "review"
                      ? "outline"
                      : "secondary"
                }
              >
                {statusMap[course.status]}
              </Badge>
            </div>
            <p className="text-muted-foreground">{course.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {course.status === "draft" && (
            <Button
              variant="outline"
              onClick={handlePublish}
              disabled={isPublishing}
            >
              {isPublishing ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Send className="mr-2 size-4" />
              )}
              Gửi duyệt
            </Button>
          )}
          {course.status === "published" && (
            <Button
              variant="outline"
              onClick={handlePublish}
              disabled={isPublishing}
            >
              {isPublishing ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Undo2 className="mr-2 size-4" />
              )}
              Chuyển về bản nháp
            </Button>
          )}
          {course.status === "review" && (
            <Button
              variant="outline"
              onClick={handlePublish}
              disabled={isPublishing}
            >
              {isPublishing ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Undo2 className="mr-2 size-4" />
              )}
              Huỷ gửi duyệt
            </Button>
          )}
          <Button
            onClick={handleSubmit(onSave)}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            Lưu thay đổi
          </Button>
        </div>
      </div>

      {/* Quick Links */}
      <div className="flex flex-wrap gap-2">
        <Link href={`/instructor/courses/${courseId}/modules`}>
          <Button variant="outline" size="sm">
            Quản lý nội dung
          </Button>
        </Link>
        <Link href={`/instructor/courses/${courseId}/students`}>
          <Button variant="outline" size="sm">
            Danh sách học viên
          </Button>
        </Link>
        <Link href={`/instructor/courses/${courseId}/reviews`}>
          <Button variant="outline" size="sm">
            Đánh giá
          </Button>
        </Link>
      </div>

      {/* Form Tabs */}
      <Tabs defaultValue="basic">
        <TabsList>
          <TabsTrigger value="basic">Thông tin cơ bản</TabsTrigger>
          <TabsTrigger value="content">Nội dung</TabsTrigger>
          <TabsTrigger value="media">Media & Giá</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin cơ bản</CardTitle>
              <CardDescription>
                Tiêu đề, mô tả và cài đặt khoá học
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Tiêu đề khoá học *</Label>
                <Input id="title" {...register("title")} />
                {errors.title && (
                  <p className="text-sm text-destructive">
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL)</Label>
                <Input id="slug" {...register("slug")} />
                {errors.slug && (
                  <p className="text-sm text-destructive">
                    {errors.slug.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Mô tả *</Label>
                <Textarea
                  id="description"
                  rows={4}
                  {...register("description")}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">
                    {errors.description.message}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Danh mục</Label>
                  <Select
                    value={watch("category_id") || ""}
                    onValueChange={(val) => setValue("category_id", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn danh mục" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Trình độ *</Label>
                  <Select
                    value={watch("level")}
                    onValueChange={(val) => setValue("level", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn trình độ" />
                    </SelectTrigger>
                    <SelectContent>
                      {levels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Ngôn ngữ *</Label>
                  <Select
                    value={watch("language")}
                    onValueChange={(val) => setValue("language", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn ngôn ngữ" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Nội dung chi tiết</CardTitle>
              <CardDescription>
                Mô tả, yêu cầu, mục tiêu và đối tượng
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="content">Nội dung chi tiết</Label>
                <Textarea
                  id="content"
                  placeholder="Mô tả chi tiết nội dung khoá học..."
                  rows={8}
                  {...register("content")}
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Yêu cầu tiên quyết</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => requirementsField.append({ value: "" })}
                  >
                    <Plus className="mr-1 size-3.5" />
                    Thêm
                  </Button>
                </div>
                {requirementsField.fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <Input
                      placeholder="VD: Biết cơ bản về máy tính"
                      {...register(`requirements.${index}.value`)}
                    />
                    {requirementsField.fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => requirementsField.remove(index)}
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Mục tiêu khoá học</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => whatYouLearnField.append({ value: "" })}
                  >
                    <Plus className="mr-1 size-3.5" />
                    Thêm
                  </Button>
                </div>
                {whatYouLearnField.fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <Input
                      placeholder="VD: Hiểu rõ cú pháp Python"
                      {...register(`what_you_learn.${index}.value`)}
                    />
                    {whatYouLearnField.fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => whatYouLearnField.remove(index)}
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Đối tượng mục tiêu</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => targetAudienceField.append({ value: "" })}
                  >
                    <Plus className="mr-1 size-3.5" />
                    Thêm
                  </Button>
                </div>
                {targetAudienceField.fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <Input
                      placeholder="VD: Sinh viên CNTT"
                      {...register(`target_audience.${index}.value`)}
                    />
                    {targetAudienceField.fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => targetAudienceField.remove(index)}
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="media" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Media & Giá</CardTitle>
              <CardDescription>
                Video giới thiệu, giá bán khoá học
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <MediaUploader
                value={watch("promo_video_url") || ""}
                onChange={(val) => setValue("promo_video_url", val)}
                accept="video/*"
                label="Video giới thiệu"
                placeholder="https://youtube.com/watch?v=..."
              />
              <MediaUploader
                value={watch("thumbnail") || ""}
                onChange={(val) => setValue("thumbnail", val)}
                accept="image/*"
                label="Hình thu nhỏ (Thumbnail)"
                type="image"
                disableUrlInput
                placeholder="Tải lên hình ảnh..."
              />
              {errors.promo_video_url && (
                <p className="text-sm text-destructive">
                  {errors.promo_video_url.message}
                </p>
              )}

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="price">Giá gốc (VND) *</Label>
                  <Input
                    id="price"
                    type="number"
                    min={0}
                    {...register("price", { valueAsNumber: true })}
                  />
                  {errors.price && (
                    <p className="text-sm text-destructive">
                      {errors.price.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount_price">Giá giảm (VND)</Label>
                  <Input
                    id="discount_price"
                    type="number"
                    min={0}
                    {...register("discount_price", { valueAsNumber: true })}
                  />
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Nhập 0 nếu khoá học miễn phí.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
