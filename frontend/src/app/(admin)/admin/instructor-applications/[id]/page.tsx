"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { apiFetch, apiPost } from "@/lib/api-fetch";
import {
  instructorApplicationStatusLabel,
  instructorApplicationTrackLabel,
  type InstructorApplicationRecord,
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

type ReviewStatus = "APPROVED" | "REJECTED" | "NEEDS_INFO";

interface DetailResponse {
  data: InstructorApplicationRecord;
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
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

function toDocumentHref(value: string): string {
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return value;
  return `/api/assets/${value}`;
}

export default function AdminInstructorApplicationDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [application, setApplication] = useState<InstructorApplicationRecord | null>(
    null,
  );

  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>("NEEDS_INFO");
  const [adminNote, setAdminNote] = useState("");

  useEffect(() => {
    if (!id) return;
    void loadDetail(id);
  }, [id]);

  async function loadDetail(applicationId: string) {
    setLoading(true);

    try {
      const res = await apiFetch(
        `/api/admin/instructor-applications/${applicationId}`,
      );

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || "Không thể tải chi tiết đơn");
      }

      const payload = (await res.json()) as DetailResponse;
      setApplication(payload.data);
      setAdminNote(payload.data.admin_note || "");

      if (payload.data.status === "PENDING") {
        setReviewStatus("NEEDS_INFO");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Không thể tải đơn đăng ký";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const applicantName = useMemo(() => {
    if (!application) return "N/A";

    if (typeof application.user_id === "string") return application.user_id;

    return (
      [application.user_id.first_name, application.user_id.last_name]
        .filter(Boolean)
        .join(" ") || application.user_id.email || "N/A"
    );
  }, [application]);

  const isFinalStatus =
    application?.status === "APPROVED" ||
    application?.status === "REJECTED" ||
    application?.status === "CANCELLED";

  async function submitReview() {
    if (!application || !id) return;

    setSaving(true);

    try {
      const res = await apiPost(
        `/api/admin/instructor-applications/${id}/review`,
        {
          status: reviewStatus,
          admin_note: adminNote,
        },
      );

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || "Không thể xét duyệt đơn");
      }

      toast.success("Cập nhật kết quả xét duyệt thành công");
      await loadDetail(id);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Xét duyệt thất bại";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Không tìm thấy đơn đăng ký.
        </p>
        <Button asChild variant="outline">
          <Link href="/admin/instructor-applications">Quay lại danh sách</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Chi tiết đơn giảng viên
          </h1>
          <p className="text-muted-foreground">
            Xem và cập nhật kết quả xét duyệt.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/instructor-applications">Quay lại danh sách</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Trạng thái
            <Badge variant={statusVariant(application.status)}>
              {instructorApplicationStatusLabel[application.status] || application.status}
            </Badge>
          </CardTitle>
          <CardDescription>
            Nộp lúc: {new Date(application.date_created).toLocaleString("vi-VN")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="font-medium">Học viên</p>
            <p>{applicantName}</p>
            {typeof application.user_id === "object" && application.user_id?.email && (
              <p className="text-muted-foreground">{application.user_id.email}</p>
            )}
          </div>

          <div>
            <p className="font-medium">Hình thức xét duyệt</p>
            <p>{instructorApplicationTrackLabel[application.track]}</p>
          </div>

          <div>
            <p className="font-medium">Lĩnh vực giảng dạy</p>
            <p>{(application.expertise_categories || []).join(", ") || "--"}</p>
          </div>

          <div>
            <p className="font-medium">Mô tả chuyên môn</p>
            <p className="whitespace-pre-wrap text-muted-foreground">
              {application.expertise_description || "--"}
            </p>
          </div>

          {application.track === "PORTFOLIO" && (
            <div>
              <p className="font-medium">Liên kết hồ sơ năng lực</p>
              <div className="space-y-1">
                {(application.portfolio_links || []).length === 0 && (
                  <p className="text-muted-foreground">Không có liên kết</p>
                )}
                {(application.portfolio_links || []).map((link) => (
                  <a
                    key={link}
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-blue-600 underline"
                  >
                    {link}
                  </a>
                ))}
              </div>
            </div>
          )}

          {application.track === "DEMO" && (
            <>
              <div>
                <p className="font-medium">Video dạy thử</p>
                {application.demo_video_link ? (
                  <a
                    href={application.demo_video_link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline"
                  >
                    {application.demo_video_link}
                  </a>
                ) : (
                  <p className="text-muted-foreground">--</p>
                )}
              </div>
              <div>
                <p className="font-medium">Đề cương khóa học</p>
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {application.course_outline || "--"}
                </p>
              </div>
            </>
          )}

          {application.track === "DOCUMENT" && (
            <div>
              <p className="font-medium">Tài liệu</p>
              <div className="space-y-1">
                {(application.document_urls || []).length === 0 && (
                  <p className="text-muted-foreground">Không có tài liệu</p>
                )}
                {(application.document_urls || []).map((item, index) => (
                  <a
                    key={`${item}-${index}`}
                    href={toDocumentHref(item)}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-blue-600 underline"
                  >
                    Tài liệu {index + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          {application.admin_note && (
            <div>
              <p className="font-medium">Ghi chú hiện tại</p>
              <p className="whitespace-pre-wrap text-muted-foreground">
                {application.admin_note}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bảng xét duyệt</CardTitle>
          <CardDescription>
            Chọn kết quả xét duyệt và thêm ghi chú gửi về học viên.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Trạng thái xét duyệt</Label>
            <Select
              value={reviewStatus}
              onValueChange={(value) => setReviewStatus(value as ReviewStatus)}
              disabled={isFinalStatus || saving}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn kết quả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NEEDS_INFO">Cần bổ sung</SelectItem>
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
              placeholder="Nội dung phản hồi cho người nộp đơn..."
              disabled={isFinalStatus || saving}
            />
          </div>

          {isFinalStatus ? (
            <p className="text-sm text-muted-foreground">
              Đơn này đã kết thúc. Bạn không thể xét duyệt lại.
            </p>
          ) : (
            <Button onClick={submitReview} disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Xác nhận xét duyệt
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
