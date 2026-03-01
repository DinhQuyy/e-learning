"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  X,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { MediaUploader } from "@/components/features/media-uploader";
import { apiFetch, apiPost } from "@/lib/api-fetch";

// Zod schemas for each step
const step1Schema = z.object({
  title: z.string().min(5, "Tiêu đề phải có ít nhất 5 ký tự"),
  slug: z.string().min(3, "Slug phải có ít nhất 3 ký tự"),
  description: z.string().min(20, "Mô tả phải có ít nhất 20 ký tự"),
  category_id: z.string().optional(),
  level: z.string().min(1, "Vui lòng chọn trình độ"),
  language: z.string().min(1, "Vui lòng chọn ngôn ngữ"),
});

const step2Schema = z.object({
  content: z.string().optional(),
  requirements: z.array(z.object({ value: z.string().min(1) })),
  what_you_learn: z.array(z.object({ value: z.string().min(1) })),
  target_audience: z.array(z.object({ value: z.string().min(1) })),
});

const step3Schema = z.object({
  thumbnail: z.string().optional(),
  promo_video_url: z.string().url("URL không hợp lệ").optional().or(z.literal("")),
  price: z.number().min(0, "Giá không được âm"),
  discount_price: z.number().min(0, "Giá giảm không được âm").optional().or(z.literal(0)),
});

const fullSchema = step1Schema.merge(step2Schema).merge(step3Schema);
type FormData = z.infer<typeof fullSchema>;

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

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

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

const steps = [
  { title: "Thông tin cơ bản", description: "Tiêu đề, mô tả, danh mục" },
  { title: "Nội dung", description: "Yêu cầu, mục tiêu, đối tượng" },
  { title: "Media & Giá", description: "Hình ảnh, video, giá bán" },
  { title: "Xem lại", description: "Kiểm tra và tạo khoá học" },
];

export default function CreateCoursePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<
    { id: number; name: string }[]
  >([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(fullSchema),
    defaultValues: {
      title: "",
      slug: "",
      description: "",
      category_id: "",
      level: "all_levels",
      language: "Tiếng Việt",
      content: "",
      requirements: [{ value: "" }],
      what_you_learn: [{ value: "" }],
      target_audience: [{ value: "" }],
      thumbnail: "",
      promo_video_url: "",
      price: 0,
      discount_price: 0,
    },
    mode: "onBlur",
  });

  const {
    register,
    setValue,
    watch,
    trigger,
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

  const allValues = watch();

  // Load categories on mount
  if (!categoriesLoaded) {
    setCategoriesLoaded(true);
    apiFetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.data ?? []))
      .catch(() => setCategories([]));
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setValue("title", title);
    setValue("slug", generateSlug(title));
  };

  const validateStep = async (step: number): Promise<boolean> => {
    switch (step) {
      case 0:
        return trigger(["title", "slug", "description", "level", "language"]);
      case 1:
        return true; // Content fields are optional
      case 2:
        return trigger(["price"]);
      default:
        return true;
    }
  };

  const handleNext = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const data = form.getValues();

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

      const res = await apiPost("/api/instructor/courses", payload);

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Không thể tạo khoá học");
      }

      const result = await res.json();
      toast.success("Tạo khoá học thành công!");
      router.push(`/instructor/courses/${result.data.id}/edit`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể tạo khoá học"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/instructor/courses">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Tạo khoá học mới
          </h1>
          <p className="text-muted-foreground">
            Điền thông tin để tạo khoá học của bạn
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center gap-2 flex-1">
            <button
              onClick={() => index < currentStep && setCurrentStep(index)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors w-full ${
                index === currentStep
                  ? "bg-indigo-500/10 text-indigo-600 font-medium"
                  : index < currentStep
                    ? "text-indigo-600 hover:bg-muted cursor-pointer"
                    : "text-muted-foreground"
              }`}
              disabled={index > currentStep}
            >
              <div
                className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                  index < currentStep
                    ? "bg-indigo-600 text-white"
                    : index === currentStep
                      ? "bg-indigo-600 text-white"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {index < currentStep ? (
                  <Check className="size-3.5" />
                ) : (
                  index + 1
                )}
              </div>
              <span className="hidden md:inline">{step.title}</span>
            </button>
            {index < steps.length - 1 && (
              <Separator className="w-4 shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep].title}</CardTitle>
          <CardDescription>{steps[currentStep].description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1: Basic Info */}
          {currentStep === 0 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="title">Tiêu đề khoá học *</Label>
                <Input
                  id="title"
                  placeholder="VD: Lập trình Python từ cơ bản đến nâng cao"
                  {...register("title")}
                  onChange={handleTitleChange}
                />
                {errors.title && (
                  <p className="text-sm text-destructive">
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL)</Label>
                <Input
                  id="slug"
                  placeholder="lap-trinh-python-tu-co-ban-den-nang-cao"
                  {...register("slug")}
                />
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
                  placeholder="Mô tả ngắn gọn về khoá học..."
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
                  {errors.level && (
                    <p className="text-sm text-destructive">
                      {errors.level.message}
                    </p>
                  )}
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
            </>
          )}

          {/* Step 2: Content */}
          {currentStep === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="content">Nội dung chi tiết</Label>
                <Textarea
                  id="content"
                  placeholder="Mô tả chi tiết nội dung khoá học (hỗ trợ HTML)..."
                  rows={6}
                  {...register("content")}
                />
              </div>

              <Separator />

              {/* Requirements */}
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

              {/* Objectives */}
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

              {/* Target Audience */}
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
            </>
          )}

          {/* Step 3: Media & Price */}
          {currentStep === 2 && (
            <>
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
                    placeholder="0"
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
                    placeholder="0"
                    {...register("discount_price", { valueAsNumber: true })}
                  />
                  {errors.discount_price && (
                    <p className="text-sm text-destructive">
                      {errors.discount_price.message}
                    </p>
                  )}
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Nhập 0 nếu khoá học miễn phí. Hình thu nhỏ có thể được tải lên
                sau khi tạo khoá học.
              </p>
            </>
          )}

          {/* Step 4: Review */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Tiêu đề
                  </p>
                  <p className="font-medium">{allValues.title || "--"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Slug
                  </p>
                  <p className="font-medium">{allValues.slug || "--"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Trình độ
                  </p>
                  <p className="font-medium">
                    {levels.find((l) => l.value === allValues.level)?.label ||
                      "--"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Ngôn ngữ
                  </p>
                  <p className="font-medium">{allValues.language || "--"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Giá
                  </p>
                  <p className="font-medium">
                    {allValues.price
                      ? new Intl.NumberFormat("vi-VN", {
                          style: "currency",
                          currency: "VND",
                          maximumFractionDigits: 0,
                        }).format(allValues.price)
                      : "Miễn phí"}
                  </p>
                </div>
                {(allValues.discount_price ?? 0) > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Giá giảm
                    </p>
                    <p className="font-medium">
                      {new Intl.NumberFormat("vi-VN", {
                        style: "currency",
                        currency: "VND",
                        maximumFractionDigits: 0,
                      }).format(allValues.discount_price!)}
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Mô tả
                </p>
                <p className="text-sm">{allValues.description || "--"}</p>
              </div>

              {allValues.requirements.filter((r) => r.value.trim()).length >
                0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Yêu cầu tiên quyết
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {allValues.requirements
                      .filter((r) => r.value.trim())
                      .map((r, i) => (
                        <Badge key={i} variant="secondary">
                          {r.value}
                        </Badge>
                      ))}
                  </div>
                </div>
              )}

              {allValues.what_you_learn.filter((o) => o.value.trim()).length >
                0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Mục tiêu
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {allValues.what_you_learn
                      .filter((o) => o.value.trim())
                      .map((o, i) => (
                        <Badge key={i} variant="secondary">
                          {o.value}
                        </Badge>
                      ))}
                  </div>
                </div>
              )}

              {allValues.target_audience.filter((t) => t.value.trim()).length >
                0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Đối tượng mục tiêu
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {allValues.target_audience
                      .filter((t) => t.value.trim())
                      .map((t, i) => (
                        <Badge key={i} variant="secondary">
                          {t.value}
                        </Badge>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="mr-2 size-4" />
          Quay lại
        </Button>

        {currentStep < steps.length - 1 ? (
          <Button onClick={handleNext}>
            Tiếp theo
            <ArrowRight className="ml-2 size-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Đang tạo...
              </>
            ) : (
              <>
                <Check className="mr-2 size-4" />
                Tạo khoá học
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
