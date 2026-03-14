"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { RichTextEditor } from "@/components/features/rich-text-editor";
import { MediaUploader } from "@/components/features/media-uploader";
import { apiFetch, apiPatch } from "@/lib/api-fetch";

const lessonSchema = z.object({
  title: z.string().min(3, "Tiêu đề phải có ít nhất 3 ký tự"),
  slug: z.string().min(3, "Slug phải có ít nhất 3 ký tự"),
  module_id: z.string().min(1, "Vui lòng chọn module"),
  type: z.string().min(1, "Vui lòng chọn loại bài học"),
  video_url: z.string().optional().or(z.literal("")),
  duration: z.number().min(0).optional(),
  content: z.string().optional(),
  is_free: z.boolean().optional(),
});

type FormData = z.infer<typeof lessonSchema>;

const lessonTypes = [
  { value: "video", label: "Video" },
  { value: "text", label: "Văn bản" },
];

const statusMap: Record<string, string> = {
  draft: "Bản nháp",
  published: "Đã xuất bản",
};

export default function EditLessonPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const lessonId = params.lessonId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentStatus, setCurrentStatus] = useState("draft");
  const [modules, setModules] = useState<{ id: number; title: string }[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      title: "",
      slug: "",
      module_id: "",
      type: "video",
      video_url: "",
      duration: 0,
      content: "",
      is_free: false,
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

  const lessonType = watch("type");
  const isFree = watch("is_free");

  const loadLesson = useCallback(async () => {
    try {
      const res = await apiFetch(
        `/api/instructor/courses/${courseId}/lessons/${lessonId}`
      );
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      const lesson = data.data;

      const moduleId =
        typeof lesson.module_id === "object" && lesson.module_id
          ? String(lesson.module_id.id)
          : lesson.module_id
            ? String(lesson.module_id)
            : "";

      setCurrentStatus(lesson.status || "draft");

      reset({
        title: lesson.title,
        slug: lesson.slug,
        module_id: moduleId,
        type: lesson.type || "video",
        video_url: lesson.video_url || "",
        duration: lesson.duration ?? 0,
        content: lesson.content || "",
        is_free: lesson.is_free ?? false,
      });
    } catch {
      toast.error("Không thể tải thông tin bài học");
      router.push(`/instructor/courses/${courseId}/modules`);
    } finally {
      setIsLoading(false);
    }
  }, [courseId, lessonId, reset, router]);

  useEffect(() => {
    loadLesson();

    apiFetch(`/api/instructor/courses/${courseId}/modules`)
      .then((r) => r.json())
      .then((d) =>
        setModules(
          (d.data ?? []).map((m: { id: number; title: string }) => ({
            id: m.id,
            title: m.title,
          }))
        )
      )
      .catch(() => setModules([]));
  }, [loadLesson, courseId]);

  const onSave = async (data: FormData, status?: string) => {
    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: data.title,
        slug: data.slug,
        module_id: data.module_id,
        type: data.type,
        video_url: data.video_url || null,
        duration: data.duration ?? 0,
        content: data.content || null,
        is_free: data.is_free ?? false,
      };

      if (status) {
        payload.status = status;
      }

      const res = await apiPatch(
        `/api/instructor/courses/${courseId}/lessons/${lessonId}`,
        payload
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Không thể lưu bài học");
      }

      toast.success("Đã lưu thay đổi!");
      if (status) setCurrentStatus(status);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể lưu bài học"
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/instructor/courses/${courseId}/modules`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                Chỉnh sửa bài học
              </h1>
              <Badge
                variant={
                  currentStatus === "published" ? "default" : "secondary"
                }
              >
                {statusMap[currentStatus] || currentStatus}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentStatus === "draft" && (
            <Button
              variant="outline"
              onClick={handleSubmit((data) => onSave(data, "published"))}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              Xuất bản
            </Button>
          )}
          {currentStatus === "published" && (
            <Button
              variant="outline"
              onClick={handleSubmit((data) => onSave(data, "draft"))}
              disabled={isSaving}
            >
              Chuyển về nháp
            </Button>
          )}
          <Button
            onClick={handleSubmit((data) => onSave(data))}
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

      <Card>
        <CardHeader>
          <CardTitle>Thông tin bài học</CardTitle>
          <CardDescription>Chỉnh sửa nội dung bài học</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Module *</Label>
              <Select
                value={watch("module_id")}
                onValueChange={(val) => setValue("module_id", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn module" />
                </SelectTrigger>
                <SelectContent>
                  {modules.map((mod) => (
                    <SelectItem key={mod.id} value={String(mod.id)}>
                      {mod.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.module_id && (
                <p className="text-sm text-destructive">
                  {errors.module_id.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Loại bài học *</Label>
              <Select
                value={watch("type")}
                onValueChange={(val) => setValue("type", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn loại" />
                </SelectTrigger>
                <SelectContent>
                  {lessonTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Tiêu đề bài học *</Label>
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

          {lessonType === "video" && (
            <div className="space-y-4">
              <MediaUploader
                value={watch("video_url") || ""}
                onChange={(val) => setValue("video_url", val)}
                accept="video/*"
                label="Video bài học"
                placeholder="https://youtube.com/watch?v=..."
              />
              <div className="space-y-2">
                <Label htmlFor="duration">Thời lượng video (phút)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={0}
                  {...register("duration", { valueAsNumber: true })}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Nội dung bài học</Label>
            <RichTextEditor
              value={watch("content") || ""}
              onChange={(val) => setValue("content", val)}
              placeholder="Nội dung bài học..."
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="is_free"
              checked={isFree}
              onCheckedChange={(checked) =>
                setValue("is_free", checked === true)
              }
            />
            <Label htmlFor="is_free" className="font-normal cursor-pointer">
              Cho phép xem trước (học viên chưa đăng ký có thể xem bài này)
            </Label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
