"use client";

import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ImportResult = {
  status: "ok";
  set_name: string;
  source_type: string;
  replaced_deleted: number;
  imported: number;
  queued: number;
  source_ids: string[];
};

const SAMPLE_QA = {
  items: [
    {
      id: "course-create-01",
      question: "Tạo khóa học mới ở đâu?",
      answer:
        "Bạn vào Cổng giảng viên, chọn Tạo khóa học mới và điền thông tin cơ bản.",
      deep_link: "/instructor/courses/new",
      aliases: ["Tạo khóa học như thế nào?"],
      tags: ["instructor", "course"],
    },
  ],
};

const SOURCE_TYPE_OPTIONS = [
  { value: "custom_qa", label: "Hỏi đáp tùy chỉnh (khuyến nghị)" },
  { value: "faq", label: "Câu hỏi thường gặp (FAQ)" },
] as const;

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Công khai" },
  { value: "enrolled_only", label: "Chỉ học viên đã ghi danh" },
  { value: "instructor_only", label: "Chỉ giảng viên" },
  { value: "admin_only", label: "Chỉ quản trị viên" },
] as const;

export function AiCustomQaUploadCard() {
  const [file, setFile] = useState<File | null>(null);
  const [setName, setSetName] = useState("private-faq");
  const [sourceType, setSourceType] = useState<"custom_qa" | "faq">(
    "custom_qa"
  );
  const [visibility, setVisibility] = useState<
    "public" | "enrolled_only" | "instructor_only" | "admin_only"
  >("public");
  const [courseId, setCourseId] = useState("");
  const [replaceSet, setReplaceSet] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const sourceTypeLabel = useMemo(
    () =>
      SOURCE_TYPE_OPTIONS.find((option) => option.value === sourceType)?.label ??
      SOURCE_TYPE_OPTIONS[0].label,
    [sourceType]
  );

  const downloadSample = () => {
    const blob = new Blob([JSON.stringify(SAMPLE_QA, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "custom_qa.import.sample.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      toast.error("Vui lòng chọn tệp JSON");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("set_name", setName.trim() || "private-faq");
      formData.append("source_type", sourceType);
      formData.append("visibility", visibility);
      formData.append("replace_set", replaceSet ? "true" : "false");
      if (courseId.trim()) {
        formData.append("course_id", courseId.trim());
      }

      const response = await fetch("/api/admin/ai/custom-qa/import", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(String(payload?.error ?? "Tải lên thất bại"));
      }

      setResult(payload as ImportResult);
      toast.success("Tải lên bộ hỏi đáp thành công");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Tải lên thất bại");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tải lên bộ hỏi đáp AI (Quản trị)</CardTitle>
        <CardDescription>
          Tải tệp JSON để cập nhật bộ câu hỏi riêng cho AI mà không cần chạy
          script.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={downloadSample}>
              Tải tệp mẫu JSON
            </Button>
            <span className="text-xs text-muted-foreground">
              Loại nguồn hiện tại:{" "}
              <span className="font-medium">{sourceTypeLabel}</span>
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="qa-file">Tệp JSON</Label>
            <Input
              id="qa-file"
              type="file"
              accept="application/json,.json"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="set-name">Tên bộ dữ liệu</Label>
              <Input
                id="set-name"
                value={setName}
                onChange={(event) => setSetName(event.target.value)}
                placeholder="private-faq"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-id">Mã khóa học (tùy chọn)</Label>
              <Input
                id="course-id"
                value={courseId}
                onChange={(event) => setCourseId(event.target.value)}
                placeholder="UUID hoặc để trống"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="source-type">Loại nguồn</Label>
              <select
                id="source-type"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={sourceType}
                onChange={(event) =>
                  setSourceType(event.target.value as "custom_qa" | "faq")
                }
              >
                {SOURCE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="visibility">Phạm vi hiển thị</Label>
              <select
                id="visibility"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={visibility}
                onChange={(event) =>
                  setVisibility(
                    event.target.value as
                      | "public"
                      | "enrolled_only"
                      | "instructor_only"
                      | "admin_only"
                  )
                }
              >
                {VISIBILITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="replace-set"
              checked={replaceSet}
              onCheckedChange={(value) => setReplaceSet(Boolean(value))}
            />
            <Label htmlFor="replace-set">
              Xóa dữ liệu cũ trong bộ trước khi nhập
            </Label>
          </div>

          <Button type="submit" disabled={uploading}>
            {uploading ? "Đang tải lên..." : "Tải lên bộ hỏi đáp"}
          </Button>
        </form>

        {result ? (
          <div className="mt-4 rounded-md border p-3 text-sm">
            <p className="font-medium">Kết quả nhập</p>
            <p>Tên bộ: {result.set_name}</p>
            <p>Đã nhập: {result.imported}</p>
            <p>Đã đưa vào hàng đợi lập chỉ mục: {result.queued}</p>
            <p>Đã xóa dữ liệu cũ: {result.replaced_deleted}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Mã nguồn: {result.source_ids.slice(0, 8).join(", ")}
              {result.source_ids.length > 8 ? " ..." : ""}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
