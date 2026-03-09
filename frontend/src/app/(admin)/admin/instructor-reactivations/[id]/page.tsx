"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { apiFetch, apiPost } from "@/lib/api-fetch";
import {
  instructorReactivationStatusLabel,
  type InstructorReactivationRequestRecord,
} from "@/lib/instructor-application";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ReviewStatus = "APPROVED" | "REJECTED";

interface DetailResponse {
  data: InstructorReactivationRequestRecord;
}

function statusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "APPROVED":
      return "default";
    case "REJECTED":
      return "destructive";
    case "CANCELLED":
      return "outline";
    default:
      return "secondary";
  }
}

export default function AdminInstructorReactivationDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requestData, setRequestData] =
    useState<InstructorReactivationRequestRecord | null>(null);

  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>("APPROVED");
  const [adminNote, setAdminNote] = useState("");

  useEffect(() => {
    if (!id) return;
    void loadDetail(id);
  }, [id]);

  async function loadDetail(requestId: string) {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/admin/instructor-reactivations/${requestId}`);

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || "Không thể tải chi tiết yêu cầu");
      }

      const payload = (await res.json()) as DetailResponse;
      setRequestData(payload.data);
      setAdminNote(payload.data.admin_note || "");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Không thể tải yêu cầu";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const requesterName = useMemo(() => {
    if (!requestData) return "N/A";
    if (typeof requestData.user_id === "string") return requestData.user_id;

    return (
      [requestData.user_id.first_name, requestData.user_id.last_name]
        .filter(Boolean)
        .join(" ") || requestData.user_id.email || "N/A"
    );
  }, [requestData]);

  const isFinalStatus =
    requestData?.status === "APPROVED" ||
    requestData?.status === "REJECTED" ||
    requestData?.status === "CANCELLED";

  async function submitReview() {
    if (!requestData || !id) return;

    setSaving(true);
    try {
      const res = await apiPost(`/api/admin/instructor-reactivations/${id}/review`, {
        status: reviewStatus,
        admin_note: adminNote,
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || "Không thể xử lý yêu cầu");
      }

      toast.success("Đã cập nhật kết quả duyệt");
      await loadDetail(id);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Xử lý yêu cầu thất bại";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!requestData) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-500">Không tìm thấy yêu cầu.</p>
        <Button asChild variant="outline">
          <Link href="/admin/instructor-reactivations">Quay lại danh sách</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Chi tiết yêu cầu kích hoạt lại
          </h1>
          <p className="text-gray-500">
            Duyệt hoặc từ chối yêu cầu cấp lại quyền giảng viên.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/instructor-reactivations">Quay lại danh sách</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Trạng thái
            <Badge variant={statusVariant(requestData.status)}>
              {instructorReactivationStatusLabel[requestData.status] || requestData.status}
            </Badge>
          </CardTitle>
          <CardDescription>
            Gửi lúc: {new Date(requestData.date_created).toLocaleString("vi-VN")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="font-medium">Người gửi</p>
            <p>{requesterName}</p>
            {typeof requestData.user_id === "object" && requestData.user_id?.email && (
              <p className="text-gray-500">{requestData.user_id.email}</p>
            )}
          </div>

          <div>
            <p className="font-medium">Lý do yêu cầu</p>
            <p className="whitespace-pre-wrap text-gray-500">
              {requestData.reason || "--"}
            </p>
          </div>

          {requestData.admin_note && (
            <div>
              <p className="font-medium">Ghi chú quản trị hiện tại</p>
              <p className="whitespace-pre-wrap text-gray-500">
                {requestData.admin_note}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bảng xét duyệt</CardTitle>
          <CardDescription>
            Chọn kết quả duyệt và gửi ghi chú về người dùng khi cần.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Kết quả duyệt</Label>
            <Select
              value={reviewStatus}
              onValueChange={(value) => setReviewStatus(value as ReviewStatus)}
              disabled={isFinalStatus || saving}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn kết quả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="APPROVED">Duyệt</SelectItem>
                <SelectItem value="REJECTED">Từ chối</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin_note">Ghi chú quản trị</Label>
            <Textarea
              id="admin_note"
              rows={4}
              value={adminNote}
              onChange={(event) => setAdminNote(event.target.value)}
              placeholder="Nội dung phản hồi cho người dùng..."
              disabled={isFinalStatus || saving}
            />
          </div>

          {isFinalStatus ? (
            <p className="text-sm text-gray-500">
              Yêu cầu này đã kết thúc. Không thể duyệt lại.
            </p>
          ) : (
            <Button onClick={submitReview} disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Xác nhận
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
