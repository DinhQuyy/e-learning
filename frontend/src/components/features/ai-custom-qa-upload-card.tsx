"use client";

import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      question: "Tao khoa hoc moi o dau?",
      answer: "Ban vao Instructor Portal, chon Tao khoa hoc moi va dien thong tin co ban.",
      deep_link: "/instructor/courses/new",
      aliases: ["Tao khoa hoc nhu the nao?"],
      tags: ["instructor", "course"],
    },
  ],
};

export function AiCustomQaUploadCard() {
  const [file, setFile] = useState<File | null>(null);
  const [setName, setSetName] = useState("private-faq");
  const [sourceType, setSourceType] = useState<"custom_qa" | "faq">("custom_qa");
  const [visibility, setVisibility] = useState<
    "public" | "enrolled_only" | "instructor_only" | "admin_only"
  >("public");
  const [courseId, setCourseId] = useState("");
  const [replaceSet, setReplaceSet] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const sourceTypeLabel = useMemo(
    () => (sourceType === "custom_qa" ? "custom_qa (khuyen nghi)" : "faq"),
    [sourceType]
  );

  const downloadSample = () => {
    const blob = new Blob([JSON.stringify(SAMPLE_QA, null, 2)], { type: "application/json" });
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
      toast.error("Vui long chon file JSON");
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
        throw new Error(String(payload?.error ?? "Upload that bai"));
      }

      setResult(payload as ImportResult);
      toast.success("Upload QA thanh cong");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload that bai");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin QA Upload</CardTitle>
        <CardDescription>
          Upload file JSON de cap nhat bo cau hoi rieng cho AI ma khong can chay script.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={downloadSample}>
              Tai file mau JSON
            </Button>
            <span className="text-xs text-muted-foreground">
              Source type hien tai: <span className="font-medium">{sourceTypeLabel}</span>
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="qa-file">File JSON</Label>
            <Input
              id="qa-file"
              type="file"
              accept="application/json,.json"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="set-name">Set name</Label>
              <Input
                id="set-name"
                value={setName}
                onChange={(event) => setSetName(event.target.value)}
                placeholder="private-faq"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-id">Course ID (optional)</Label>
              <Input
                id="course-id"
                value={courseId}
                onChange={(event) => setCourseId(event.target.value)}
                placeholder="uuid hoac de trong"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="source-type">Source type</Label>
              <select
                id="source-type"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={sourceType}
                onChange={(event) => setSourceType(event.target.value as "custom_qa" | "faq")}
              >
                <option value="custom_qa">custom_qa</option>
                <option value="faq">faq</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="visibility">Visibility</Label>
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
                <option value="public">public</option>
                <option value="enrolled_only">enrolled_only</option>
                <option value="instructor_only">instructor_only</option>
                <option value="admin_only">admin_only</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="replace-set"
              checked={replaceSet}
              onCheckedChange={(value) => setReplaceSet(Boolean(value))}
            />
            <Label htmlFor="replace-set">Xoa bo cu trong set truoc khi import</Label>
          </div>

          <Button type="submit" disabled={uploading}>
            {uploading ? "Dang upload..." : "Upload QA"}
          </Button>
        </form>

        {result ? (
          <div className="mt-4 rounded-md border p-3 text-sm">
            <p className="font-medium">Ket qua import</p>
            <p>Set: {result.set_name}</p>
            <p>Imported: {result.imported}</p>
            <p>Queued for indexing: {result.queued}</p>
            <p>Deleted old docs: {result.replaced_deleted}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Source IDs: {result.source_ids.slice(0, 8).join(", ")}
              {result.source_ids.length > 8 ? " ..." : ""}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
