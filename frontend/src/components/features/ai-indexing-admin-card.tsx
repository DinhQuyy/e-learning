"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bot, Loader2, RefreshCw, RotateCw } from "lucide-react";
import { toast } from "sonner";

import { apiGet, apiPost } from "@/lib/api-fetch";
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

type IndexingStatusPayload = {
  queue_depth: number;
  total_documents: number;
  indexed_documents: number;
  pending_documents: number;
  total_chunks: number;
  oldest_pending_updated_at: string | null;
};

type RequeueResult = {
  status: "ok";
  queued: number;
  queue_depth: number;
  document_ids: string[];
};

const SOURCE_OPTIONS = [
  { value: "", label: "Tat ca nguon" },
  { value: "course_lesson", label: "course_lesson" },
  { value: "course_module", label: "course_module" },
  { value: "quiz", label: "quiz" },
  { value: "system_docs", label: "system_docs" },
  { value: "custom_qa", label: "custom_qa" },
  { value: "faq", label: "faq" },
  { value: "policy", label: "policy" },
  { value: "references", label: "references" },
];

function readErrorMessage(raw: unknown, fallback: string): string {
  if (raw && typeof raw === "object" && "error" in raw) {
    const message = (raw as { error?: unknown }).error;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  return fallback;
}

export function AiIndexingAdminCard() {
  const [status, setStatus] = useState<IndexingStatusPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sourceType, setSourceType] = useState("");
  const [courseId, setCourseId] = useState("");
  const [pendingOnly, setPendingOnly] = useState(true);
  const [limitInput, setLimitInput] = useState("100");
  const [requeueLoading, setRequeueLoading] = useState(false);
  const [lastRequeueResult, setLastRequeueResult] = useState<RequeueResult | null>(null);

  const loadStatus = useCallback(
    async (mode: "init" | "refresh" = "refresh") => {
      if (mode === "init") {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const response = await apiGet("/api/admin/ai/indexing/status");
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(readErrorMessage(payload, "Khong the tai trang thai indexing"));
        }
        setStatus(payload as IndexingStatusPayload);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Loi khong xac dinh";
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadStatus("init");
    const interval = window.setInterval(() => {
      void loadStatus("refresh");
    }, 15000);
    return () => window.clearInterval(interval);
  }, [loadStatus]);

  const pendingRate = useMemo(() => {
    if (!status || status.total_documents <= 0) return 0;
    return (status.pending_documents / status.total_documents) * 100;
  }, [status]);

  const oldestPendingLabel = useMemo(() => {
    if (!status?.oldest_pending_updated_at) {
      return "Khong co";
    }
    const date = new Date(status.oldest_pending_updated_at);
    if (Number.isNaN(date.getTime())) {
      return status.oldest_pending_updated_at;
    }
    return date.toLocaleString("vi-VN");
  }, [status?.oldest_pending_updated_at]);

  async function handleRequeue() {
    if (requeueLoading) return;
    const rawLimit = Number(limitInput);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(Math.floor(rawLimit), 1), 500)
      : 100;

    setRequeueLoading(true);
    try {
      const response = await apiPost("/api/admin/ai/indexing/requeue", {
        source_type: sourceType || undefined,
        course_id: courseId.trim() || undefined,
        pending_only: pendingOnly,
        limit,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(readErrorMessage(payload, "Khong the dua tai lieu vao hang doi reindex"));
      }

      const result = payload as RequeueResult;
      setLastRequeueResult(result);
      toast.success(`Da dua ${result.queued} tai lieu vao hang doi.`);
      await loadStatus("refresh");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reindex that bai");
    } finally {
      setRequeueLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Trang thai AI Indexing
        </CardTitle>
        <CardDescription>
          Theo doi hang doi indexing va retry reindex cho cac tai lieu chua duoc xu ly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Dang tai trang thai indexing...
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {status ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Queue depth</p>
              <p className="text-lg font-semibold">{status.queue_depth}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Tai lieu tong</p>
              <p className="text-lg font-semibold">{status.total_documents}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Da indexed</p>
              <p className="text-lg font-semibold">{status.indexed_documents}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Dang cho indexing</p>
              <p className="text-lg font-semibold">{status.pending_documents}</p>
              <p className="text-xs text-muted-foreground">{pendingRate.toFixed(1)}%</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Tong chunk</p>
              <p className="text-lg font-semibold">{status.total_chunks}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Pending cu nhat</p>
              <p className="text-sm font-medium">{oldestPendingLabel}</p>
            </div>
          </div>
        ) : null}

        <div className="rounded-lg border p-4">
          <p className="mb-3 text-sm font-medium">Reindex retry</p>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="source-type">Nguon</Label>
              <select
                id="source-type"
                value={sourceType}
                onChange={(event) => setSourceType(event.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {SOURCE_OPTIONS.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="course-id">Course ID (tuy chon)</Label>
              <Input
                id="course-id"
                value={courseId}
                onChange={(event) => setCourseId(event.target.value)}
                placeholder="UUID course"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="limit">Gioi han moi lan</Label>
              <Input
                id="limit"
                type="number"
                min={1}
                max={500}
                value={limitInput}
                onChange={(event) => setLimitInput(event.target.value)}
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Checkbox
              id="pending-only"
              checked={pendingOnly}
              onCheckedChange={(value) => setPendingOnly(Boolean(value))}
            />
            <Label htmlFor="pending-only">Chi requeue tai lieu chua co chunk</Label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => void loadStatus("refresh")}>
              {refreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Lam moi
            </Button>
            <Button type="button" onClick={() => void handleRequeue()} disabled={requeueLoading}>
              {requeueLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCw className="mr-2 h-4 w-4" />
              )}
              Requeue retry
            </Button>
          </div>
        </div>

        {lastRequeueResult ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            Da queue lai {lastRequeueResult.queued} tai lieu. Queue hien tai:{" "}
            {lastRequeueResult.queue_depth}.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

