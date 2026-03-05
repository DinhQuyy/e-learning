"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ZodError } from "zod";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Loader2,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { apiFetch, apiPatch, apiPost } from "@/lib/api-fetch";
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  type InstructorApplicationRecord,
  type InstructorReactivationRequestRecord,
  type InstructorState,
  type InstructorApplicationSubmissionInput,
  instructorApplicationStatusLabel,
  instructorApplicationTrackLabel,
  instructorReactivationStatusLabel,
  instructorStateLabel,
  INSTRUCTOR_APPLICATION_TRACKS,
  MAX_DOCUMENT_FILES,
  MAX_DOCUMENT_SIZE_BYTES,
  coerceSubmissionInput,
  joinCommaSeparated,
  joinLineSeparated,
  normalizeApplicationPayload,
  splitCommaSeparated,
  splitLineSeparated,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

interface ApplicationMeResponse {
  application: InstructorApplicationRecord | null;
  can_apply: boolean;
  can_resubmit: boolean;
  reason: string | null;
  next_apply_at: string | null;
}

interface ReactivationMeResponse {
  has_instructor_role: boolean;
  instructor_state: InstructorState;
  request: InstructorReactivationRequestRecord | null;
}

const defaultForm: InstructorApplicationSubmissionInput = {
  track: "PORTFOLIO",
  expertise_categories: [],
  expertise_description: "",
  portfolio_links: [],
  demo_video_link: "",
  course_outline: "",
  document_urls: [],
  terms_accepted: false,
};

function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "APPROVED":
      return "default";
    case "NEEDS_INFO":
      return "secondary";
    case "REJECTED":
      return "destructive";
    case "CANCELLED":
      return "outline";
    default:
      return "secondary";
  }
}

function reactivationBadgeVariant(
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

export default function BecomeInstructorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [enteringPortal, setEnteringPortal] = useState(false);
  const [cancellingReactivation, setCancellingReactivation] = useState(false);

  const [application, setApplication] = useState<InstructorApplicationRecord | null>(
    null,
  );
  const [canApply, setCanApply] = useState(false);
  const [canResubmit, setCanResubmit] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [nextApplyAt, setNextApplyAt] = useState<string | null>(null);
  const [instructorState, setInstructorState] = useState<InstructorState>("NONE");
  const [hasInstructorRole, setHasInstructorRole] = useState(false);
  const [reactivationRequest, setReactivationRequest] =
    useState<InstructorReactivationRequestRecord | null>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [startNew, setStartNew] = useState(false);

  const [form, setForm] = useState<InstructorApplicationSubmissionInput>(
    defaultForm,
  );
  const [categoriesText, setCategoriesText] = useState("");
  const [portfolioText, setPortfolioText] = useState("");

  const canEditExisting = application?.status === "NEEDS_INFO";
  const canStartNewFromHistory =
    !!application &&
    (application.status === "REJECTED" || application.status === "CANCELLED") &&
    canApply;

  const showForm =
    !application || canEditExisting || (canStartNewFromHistory && startNew);

  const summary = useMemo(
    () => ({
      categories: splitCommaSeparated(categoriesText),
      portfolioLinks: splitLineSeparated(portfolioText),
    }),
    [categoriesText, portfolioText],
  );

  const resetForm = useCallback(() => {
    setForm(defaultForm);
    setCategoriesText("");
    setPortfolioText("");
    setStartNew(false);
  }, []);

  const hydrateForm = useCallback((value: InstructorApplicationRecord) => {
    setForm({
      track: value.track,
      expertise_categories: value.expertise_categories ?? [],
      expertise_description: value.expertise_description ?? "",
      portfolio_links: value.portfolio_links ?? [],
      demo_video_link: value.demo_video_link ?? "",
      course_outline: value.course_outline ?? "",
      document_urls: value.document_urls ?? [],
      terms_accepted: Boolean(value.terms_accepted),
    });
    setCategoriesText(joinCommaSeparated(value.expertise_categories));
    setPortfolioText(joinLineSeparated(value.portfolio_links));
  }, []);

  const loadReactivationState = useCallback(async () => {
    try {
      const res = await apiFetch("/api/instructor/reactivation/me/latest");
      if (!res.ok) {
        return;
      }

      const payload = (await res.json()) as ReactivationMeResponse;
      setHasInstructorRole(Boolean(payload.has_instructor_role));
      setInstructorState(payload.instructor_state || "NONE");
      setReactivationRequest(payload.request ?? null);
    } catch {
      // keep previous state when refresh fails
    }
  }, []);

  const loadState = useCallback(async () => {
    setLoading(true);
    try {
      const [applicationRes] = await Promise.all([
        apiFetch("/api/instructor-application/me"),
        loadReactivationState(),
      ]);
      if (!applicationRes.ok) {
        const data = await applicationRes.json().catch(() => null);
        throw new Error(data?.error || "Không thể tải trạng thái đơn");
      }

      const payload = (await applicationRes.json()) as ApplicationMeResponse;
      setApplication(payload.application);
      setCanApply(payload.can_apply);
      setCanResubmit(payload.can_resubmit);
      setReason(payload.reason);
      setNextApplyAt(payload.next_apply_at);

      if (payload.application?.status === "NEEDS_INFO") {
        hydrateForm(payload.application);
      } else if (!payload.application || payload.can_apply) {
        resetForm();
      }

      if (payload.application?.status === "NEEDS_INFO") {
        setStep(2);
      } else {
        setStep(1);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Không thể tải thông tin";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [hydrateForm, loadReactivationState, resetForm]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  useEffect(() => {
    if (application?.status !== "APPROVED") return;
    if (reactivationRequest?.status !== "PENDING") return;

    const interval = setInterval(() => {
      void loadReactivationState();
    }, 5000);

    return () => clearInterval(interval);
  }, [application?.status, loadReactivationState, reactivationRequest?.status]);

  async function handleEnterInstructorPortal() {
    setEnteringPortal(true);
    try {
      const res = await apiPost("/api/instructor/portal/enter");
      const payload = await res.json().catch(() => null);

      if (!res.ok && res.status !== 202) {
        throw new Error(payload?.error || "Không thể mở Cổng giảng viên");
      }

      if (payload?.redirectUrl) {
        await apiFetch("/api/auth/me");
        router.push(payload.redirectUrl);
        router.refresh();
        return;
      }

      if (payload?.status === "PENDING") {
        if (payload?.request) {
          setReactivationRequest(payload.request as InstructorReactivationRequestRecord);
        }
        setHasInstructorRole(false);
        toast.success(
          payload?.message ||
            "Yêu cầu kích hoạt lại đã được gửi để Quản trị viên duyệt.",
        );
        return;
      }

      throw new Error("Không xác định được kết quả truy cập cổng giảng viên");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Không thể mở Cổng giảng viên";
      toast.error(message);
    } finally {
      setEnteringPortal(false);
      await loadReactivationState();
    }
  }

  async function cancelReactivationRequest() {
    if (!reactivationRequest?.id || reactivationRequest.status !== "PENDING") {
      return;
    }

    setCancellingReactivation(true);
    try {
      const res = await apiPost(
        `/api/instructor/reactivation/${reactivationRequest.id}/cancel`,
      );
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || "Không thể hủy yêu cầu kích hoạt lại");
      }

      toast.success("Đã hủy yêu cầu kích hoạt lại");
      await loadReactivationState();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Không thể hủy yêu cầu kích hoạt lại";
      toast.error(message);
    } finally {
      setCancellingReactivation(false);
    }
  }

  async function handleUploadDocuments(files: FileList | null) {
    if (!files || files.length === 0) return;

    const incoming = Array.from(files);

    if (form.document_urls.length + incoming.length > MAX_DOCUMENT_FILES) {
      toast.error(`Tối đa ${MAX_DOCUMENT_FILES} tài liệu`);
      return;
    }

    for (const file of incoming) {
      if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(file.type as (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number])) {
        toast.error("Chỉ hỗ trợ file PDF, JPG, PNG");
        return;
      }

      if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
        toast.error("Mỗi file tối đa 10MB");
        return;
      }
    }

    setUploading(true);

    try {
      const uploadedIds: string[] = [];

      for (const file of incoming) {
        const formData = new FormData();
        formData.append("file", file);

        const uploadRes = await apiFetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error("Không thể tải tài liệu lên hệ thống");
        }

        const uploadPayload = await uploadRes.json().catch(() => null);
        const fileId = uploadPayload?.data?.id;

        if (!fileId || typeof fileId !== "string") {
          throw new Error("Không nhận được mã file sau khi tải lên");
        }

        uploadedIds.push(fileId);
      }

      setForm((prev) => ({
        ...prev,
        document_urls: [...prev.document_urls, ...uploadedIds],
      }));

      toast.success("Tài liệu đã được tải lên");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Không thể tải tài liệu";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }

  function removeDocumentAt(index: number) {
    setForm((prev) => ({
      ...prev,
      document_urls: prev.document_urls.filter((_, i) => i !== index),
    }));
  }

  async function submitApplication() {
    setSubmitting(true);

    try {
      const prepared = normalizeApplicationPayload(
        coerceSubmissionInput({
          ...form,
          expertise_categories: splitCommaSeparated(categoriesText),
          portfolio_links: splitLineSeparated(portfolioText),
        }),
      );

      const response = canEditExisting
        ? await apiPatch(`/api/instructor-application/${application?.id}`, prepared)
        : await apiPost("/api/instructor-application", prepared);

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.error || "Gửi đơn thất bại");
      }

      toast.success(
        canEditExisting
          ? "Đã gửi bổ sung hồ sơ thành công"
          : "Đã gửi đơn trở thành giảng viên",
      );

      setStartNew(false);
      await loadState();
    } catch (error) {
      if (error instanceof ZodError) {
        const firstIssue = error.issues[0]?.message || "Dữ liệu không hợp lệ";
        toast.error(firstIssue);
      } else {
        const message = error instanceof Error ? error.message : "Gửi đơn thất bại";
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelApplication() {
    if (!application) return;

    setSubmitting(true);
    try {
      const res = await apiPost(
        `/api/instructor-application/${application.id}/cancel`,
      );

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || "Không thể hủy đơn");
      }

      toast.success("Đơn đăng ký đã được hủy");
      await loadState();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể hủy đơn";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Trở thành giảng viên</h1>
        <p className="text-muted-foreground">
          Gửi hồ sơ để hệ thống/Quản trị viên xét duyệt quyền Giảng viên.
        </p>
      </div>

      {application && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Trạng thái đơn
              <Badge variant={statusBadgeVariant(application.status)}>
                {instructorApplicationStatusLabel[application.status] || application.status}
              </Badge>
            </CardTitle>
            <CardDescription>
              Nộp lúc: {new Date(application.date_created).toLocaleString("vi-VN")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Hình thức xét duyệt: {instructorApplicationTrackLabel[application.track]}
            </p>

            {application.admin_note && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-medium">Ghi chú từ Quản trị viên</p>
                <p>{application.admin_note}</p>
              </div>
            )}

            {application.status === "APPROVED" && (
              <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">Bạn đã từng được duyệt giảng viên.</p>
                  <Badge variant="outline">
                    {instructorStateLabel[instructorState] || instructorState}
                  </Badge>
                  {reactivationRequest?.status && (
                    <Badge variant={reactivationBadgeVariant(reactivationRequest.status)}>
                      {instructorReactivationStatusLabel[reactivationRequest.status] ||
                        reactivationRequest.status}
                    </Badge>
                  )}
                </div>

                <p className="mt-2 text-emerald-800">
                  {hasInstructorRole
                    ? "Quyền Giảng viên đang hoạt động."
                    : "Nếu vai trò Giảng viên đang tắt, bấm nút bên dưới để gửi yêu cầu kích hoạt lại."}
                </p>

                {reactivationRequest?.admin_note && (
                  <div className="mt-2 rounded border border-emerald-300/70 bg-white/80 p-2 text-xs text-emerald-900">
                    <p className="font-medium">Ghi chú quản trị (kích hoạt lại)</p>
                    <p>{reactivationRequest.admin_note}</p>
                  </div>
                )}

                {instructorState === "SUSPENDED" && (
                  <p className="mt-2 text-xs text-red-700">
                    Tài khoản giảng viên đang bị tạm khóa. Vui lòng liên hệ quản trị viên.
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={handleEnterInstructorPortal}
                    disabled={
                      enteringPortal ||
                      instructorState === "SUSPENDED" ||
                      (!hasInstructorRole && reactivationRequest?.status === "PENDING")
                    }
                  >
                    {enteringPortal ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <ArrowRight className="mr-2 size-4" />
                    )}
                    {hasInstructorRole
                      ? "Đi đến Cổng giảng viên"
                      : reactivationRequest?.status === "PENDING"
                        ? "Đang chờ quản trị viên duyệt"
                        : "Đi đến Cổng giảng viên"}
                  </Button>

                  {!hasInstructorRole && reactivationRequest?.status === "PENDING" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={cancelReactivationRequest}
                      disabled={cancellingReactivation || enteringPortal}
                    >
                      {cancellingReactivation ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <XCircle className="mr-2 size-4" />
                      )}
                      Hủy yêu cầu kích hoạt lại
                    </Button>
                  )}
                </div>
              </div>
            )}

            {(application.status === "PENDING" || application.status === "NEEDS_INFO") && (
              <div className="flex flex-wrap gap-2">
                {application.status === "NEEDS_INFO" && canResubmit && (
                  <Badge variant="secondary">Bạn có thể bổ sung và gửi lại</Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cancelApplication}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <XCircle className="mr-2 size-4" />
                  )}
                  Hủy đơn
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!showForm && reason && (
        <Card>
          <CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
            <AlertCircle className="mt-0.5 size-4" />
            <div>
              <p>{reason}</p>
              {nextApplyAt && (
                <p className="mt-1">Bạn có thể nộp lại sau: {new Date(nextApplyAt).toLocaleString("vi-VN")}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {canStartNewFromHistory && !startNew && (
        <Card>
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <p className="text-sm text-muted-foreground">
              Bạn đã có thể nộp đơn mới.
            </p>
            <Button
              onClick={() => {
                resetForm();
                setStartNew(true);
                setStep(1);
              }}
            >
              Tạo đơn mới
            </Button>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {canEditExisting ? "Bổ sung thông tin hồ sơ" : "Mẫu đơn đăng ký Giảng viên"}
            </CardTitle>
            <CardDescription>
              Hoàn tất 3 bước và gửi đến Quản trị viên để xét duyệt.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    step === value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                  onClick={() => setStep(value as 1 | 2 | 3)}
                >
                  Bước {value}
                </button>
              ))}
            </div>

            {step === 1 && (
              <div className="space-y-4">
                <Label>Chọn hình thức xét duyệt</Label>
                <RadioGroup
                  value={form.track}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      track: value as InstructorApplicationSubmissionInput["track"],
                    }))
                  }
                >
                  {INSTRUCTOR_APPLICATION_TRACKS.map((track) => (
                    <div key={track} className="flex items-start gap-3 rounded-md border p-3">
                      <RadioGroupItem id={`track-${track}`} value={track} className="mt-1" />
                      <div>
                        <Label htmlFor={`track-${track}`} className="font-medium">
                          {instructorApplicationTrackLabel[track]}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {track === "PORTFOLIO" && "Gửi CV/LinkedIn/portfolio để xét duyệt"}
                          {track === "DEMO" && "Gửi video dạy thử và đề cương khóa học"}
                          {track === "DOCUMENT" && "Tải lên giấy tờ/chứng nhận liên quan"}
                        </p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="categories">Lĩnh vực giảng dạy</Label>
                  <Input
                    id="categories"
                    value={categoriesText}
                    onChange={(event) => setCategoriesText(event.target.value)}
                    placeholder="Ví dụ: React, Node.js, UI/UX"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expertise_description">Mô tả chuyên môn</Label>
                  <Textarea
                    id="expertise_description"
                    rows={5}
                    value={form.expertise_description}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        expertise_description: event.target.value,
                      }))
                    }
                    placeholder="Trình bày kinh nghiệm, kỹ năng và định hướng giảng dạy..."
                  />
                </div>

                {form.track === "PORTFOLIO" && (
                  <div className="space-y-2">
                    <Label htmlFor="portfolio_links">Liên kết portfolio (mỗi dòng 1 link)</Label>
                    <Textarea
                      id="portfolio_links"
                      rows={4}
                      value={portfolioText}
                      onChange={(event) => setPortfolioText(event.target.value)}
                      placeholder="https://linkedin.com/in/username\nhttps://github.com/username"
                    />
                  </div>
                )}

                {form.track === "DEMO" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="demo_video_link">Link video dạy thử</Label>
                      <Input
                        id="demo_video_link"
                        value={form.demo_video_link || ""}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, demo_video_link: event.target.value }))
                        }
                        placeholder="https://youtube.com/..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="course_outline">Đề cương khóa học</Label>
                      <Textarea
                        id="course_outline"
                        rows={4}
                        value={form.course_outline || ""}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, course_outline: event.target.value }))
                        }
                        placeholder="Mô tả chủ đề, mục tiêu và đối tượng học viên..."
                      />
                    </div>
                  </>
                )}

                {form.track === "DOCUMENT" && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="document_upload">Tài liệu minh chứng</Label>
                      <Input
                        id="document_upload"
                        type="file"
                        multiple
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={(event) => {
                          void handleUploadDocuments(event.target.files);
                          event.currentTarget.value = "";
                        }}
                        disabled={uploading}
                      />
                      <p className="text-xs text-muted-foreground">
                        Tối đa {MAX_DOCUMENT_FILES} file, mỗi file không quá 10MB.
                      </p>
                    </div>

                    <div className="space-y-2">
                      {form.document_urls.length === 0 && (
                        <p className="text-sm text-muted-foreground">Chưa có tài liệu nào được tải lên.</p>
                      )}

                      {form.document_urls.map((fileRef, index) => (
                        <div
                          key={`${fileRef}-${index}`}
                          className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                        >
                          <span className="line-clamp-1 font-mono text-xs">{fileRef}</span>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => removeDocumentAt(index)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="rounded-md border p-4">
                  <h3 className="mb-3 text-sm font-semibold">Xem lại thông tin</h3>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="font-medium text-muted-foreground">Hình thức</dt>
                      <dd>{instructorApplicationTrackLabel[form.track]}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-muted-foreground">Lĩnh vực</dt>
                      <dd>{summary.categories.join(", ") || "Chưa nhập"}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-muted-foreground">Mô tả chuyên môn</dt>
                      <dd className="whitespace-pre-wrap">{form.expertise_description || "Chưa nhập"}</dd>
                    </div>
                    {form.track === "PORTFOLIO" && (
                      <div>
                        <dt className="font-medium text-muted-foreground">Liên kết portfolio</dt>
                        <dd>{summary.portfolioLinks.length || 0} liên kết</dd>
                      </div>
                    )}
                    {form.track === "DEMO" && (
                      <>
                        <div>
                          <dt className="font-medium text-muted-foreground">Video dạy thử</dt>
                          <dd>{form.demo_video_link || "Chưa nhập"}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-muted-foreground">Đề cương</dt>
                          <dd className="whitespace-pre-wrap">{form.course_outline || "Chưa nhập"}</dd>
                        </div>
                      </>
                    )}
                    {form.track === "DOCUMENT" && (
                      <div>
                        <dt className="font-medium text-muted-foreground">Tài liệu</dt>
                        <dd>{form.document_urls.length} file</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div className="flex items-start gap-3 rounded-md border p-3">
                  <Checkbox
                    id="terms_accepted"
                    checked={form.terms_accepted}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({ ...prev, terms_accepted: Boolean(checked) }))
                    }
                  />
                  <div className="space-y-1">
                    <Label htmlFor="terms_accepted">
                      Tôi đồng ý điều khoản giảng viên và cam kết bản quyền nội dung.
                    </Label>
                  </div>
                </div>

                <div className="rounded-md border border-blue-300 bg-blue-50 p-3 text-sm text-blue-900">
                  <div className="flex items-start gap-2">
                    <Clock3 className="mt-0.5 size-4" />
                    <p>Sau khi gửi, đơn sẽ chuyển sang trạng thái PENDING để Quản trị viên xét duyệt.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {uploading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Đang tải tài liệu...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-3.5" />
                    Hoàn tất thông tin theo từng bước
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {step > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep((prev) => (prev - 1) as 1 | 2 | 3)}
                  >
                    Quay lại
                  </Button>
                )}

                {step < 3 && (
                  <Button
                    type="button"
                    onClick={() => setStep((prev) => (prev + 1) as 1 | 2 | 3)}
                  >
                    Tiếp tục
                  </Button>
                )}

                {step === 3 && (
                  <Button
                    type="button"
                    onClick={submitApplication}
                    disabled={submitting || uploading}
                  >
                    {submitting ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 size-4" />
                    )}
                    {canEditExisting ? "Gửi bổ sung" : "Gửi đơn"}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!application && !canApply && reason && (
        <Card>
          <CardContent className="flex items-start gap-3 p-4 text-sm text-amber-800">
            <AlertCircle className="mt-0.5 size-4" />
            <p>{reason}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
