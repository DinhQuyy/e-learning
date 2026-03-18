import Link from "next/link";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  ExternalLink,
  Hash,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { requireAuth } from "@/lib/dal";
import { getUserCertificateByEnrollmentId } from "@/lib/queries/certificates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Certificate, Course, DirectusUser } from "@/types";
import { DeleteCertificateButton } from "../../delete-certificate-button";
import { PrintCertificateButton } from "./print-certificate-button";
import { ShareCertificateButton } from "./share-certificate-button";

export const dynamic = "force-dynamic";

function resolveCourse(certificate: Certificate): Course | null {
  if (!certificate.course_id || typeof certificate.course_id === "string") {
    return null;
  }
  return certificate.course_id as Course;
}

function resolveLearnerName(certificate: Certificate): string {
  const user = certificate.user_id;
  if (!user || typeof user === "string") return "Học viên";

  const profile = user as DirectusUser;
  const fullName = [profile.first_name, profile.last_name]
    .filter((value) => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .trim();

  if (fullName.length > 0) return fullName;
  if (typeof profile.email === "string" && profile.email.length > 0) {
    return profile.email;
  }
  return "Học viên";
}

export default async function CertificateDetailPage({
  params,
}: {
  params: Promise<{ enrollmentId: string }>;
}) {
  const { token, user } = await requireAuth();
  const { enrollmentId } = await params;

  const certificate = await getUserCertificateByEnrollmentId(
    token,
    enrollmentId,
    user.id
  );

  if (!certificate) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline">
            <Link href="/my-courses">
              <ArrowLeft className="mr-2 size-4" />
              Quay lại khóa học của tôi
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/my-certificates">Danh sách chứng chỉ</Link>
          </Button>
        </div>

        <Card>
          <CardContent className="space-y-3 py-8">
            <h1 className="text-xl font-semibold">Chưa tìm thấy chứng chỉ</h1>
            <p className="text-sm text-muted-foreground">
              Chứng chỉ cho khóa học này có thể chưa được tạo hoặc bạn chưa hoàn thành
              đủ điều kiện.
            </p>
            <p className="text-xs text-muted-foreground">
              Mã enrollment: <span className="font-mono">{enrollmentId}</span>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const course = resolveCourse(certificate);
  const learnerName = resolveLearnerName(certificate);
  const issuedAt = certificate.issued_at ?? certificate.date_created;
  const issuedAtLabel = issuedAt
    ? format(new Date(issuedAt), "dd/MM/yyyy", { locale: vi })
    : "N/A";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button asChild variant="outline">
          <Link href="/my-certificates">
            <ArrowLeft className="mr-2 size-4" />
            Danh sách chứng chỉ
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          {course?.slug ? (
            <Button asChild variant="outline">
              <Link href={`/learn/${course.slug}`}>
                Xem khóa học
                <ExternalLink className="ml-2 size-4" />
              </Link>
            </Button>
          ) : null}
          <ShareCertificateButton
            certificateCode={certificate.certificate_code}
            courseTitle={course?.title ?? "Khóa học"}
            learnerName={learnerName}
          />
          <PrintCertificateButton />
          <DeleteCertificateButton
            certificateId={certificate.id}
            courseTitle={course?.title}
            redirectTo="/my-certificates"
          />
        </div>
      </div>

      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-[#eef3ff] via-[#f7f9ff] to-[#f6efff] p-5 shadow-sm print:hidden sm:p-6">
        <div className="pointer-events-none absolute -left-10 top-6 size-40 rounded-full bg-[#2f57ef]/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-8 -top-10 size-44 rounded-full bg-[#b966e7]/20 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <Badge className="w-fit rounded-full bg-white text-slate-700 shadow-sm">
              <ShieldCheck className="mr-1.5 size-3.5 text-emerald-600" />
              Chứng chỉ đã được xác thực
            </Badge>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Chứng chỉ hoàn thành khóa học
            </h1>
            <p className="text-sm text-slate-600 sm:text-base">
              Bạn có thể dùng chứng chỉ này để bổ sung vào hồ sơ học tập, CV hoặc chia
              sẻ lên hồ sơ nghề nghiệp. Mã chứng chỉ là duy nhất và có thể xác thực trực
              tuyến.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[420px]">
            <div className="rounded-2xl border border-white/80 bg-white/85 px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Trạng thái
              </p>
              <p className="mt-1 text-sm font-semibold text-emerald-700">Đã cấp</p>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/85 px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Ngày cấp
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{issuedAtLabel}</p>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/85 px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Mã
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                {certificate.certificate_code}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-5xl rounded-[30px] bg-gradient-to-r from-[#2f57ef] via-[#6f7af7] to-[#b966e7] p-[1.5px] shadow-[0_30px_70px_-45px_rgba(47,87,239,0.75)] print:rounded-none print:bg-white print:p-0 print:shadow-none">
        <Card className="overflow-hidden rounded-[28px] border-0 bg-white py-0 print:rounded-none print:border print:border-slate-300 print:shadow-none">
          <CardContent className="relative overflow-hidden p-0">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(47,87,239,0.12),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(185,102,231,0.12),transparent_42%)]" />
            <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 rounded-full border border-slate-200/80 px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-300">
              Learnify
            </div>

            <div className="relative px-6 pb-8 pt-14 sm:px-10 sm:pb-10 sm:pt-16 lg:px-14">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.42em] text-slate-500">
                    Kognify
                  </p>
                  <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                    Certificate of Completion
                  </h2>
                </div>
                <Badge
                  variant="secondary"
                  className="rounded-full border border-slate-300 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600"
                >
                  {certificate.certificate_code}
                </Badge>
              </div>

              <div className="mt-10 space-y-4 text-center">
                <p className="text-sm font-medium text-slate-600">Trao tặng học viên</p>
                <p className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                  {learnerName}
                </p>
                <p className="text-base text-slate-600">đã hoàn thành xuất sắc khóa học</p>
                <p className="mx-auto max-w-3xl text-2xl font-semibold leading-tight text-slate-900 sm:text-3xl">
                  {course?.title ?? "Khóa học"}
                </p>
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/85 px-4 py-4">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    <CalendarDays className="size-3.5" />
                    Ngày cấp
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{issuedAtLabel}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/85 px-4 py-4">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    <UserRound className="size-3.5" />
                    Học viên
                  </p>
                  <p className="mt-2 line-clamp-1 text-lg font-semibold text-slate-900">
                    {learnerName}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/85 px-4 py-4 sm:col-span-2 lg:col-span-1">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    <Hash className="size-3.5" />
                    Mã xác thực
                  </p>
                  <p className="mt-2 break-all font-mono text-sm font-semibold text-slate-900">
                    {certificate.certificate_code}
                  </p>
                </div>
              </div>

              <div className="mt-10 grid gap-6 border-t border-dashed border-slate-300 pt-6 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Đại diện đào tạo
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">Learnify Academy</p>
                  <p className="text-slate-600">Authorized Certification Provider</p>
                </div>

                <div className="sm:text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Xác thực trực tuyến
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    learnify.vn/verify
                  </p>
                  <p className="flex items-center justify-start gap-1.5 text-slate-600 sm:justify-end">
                    <BadgeCheck className="size-4 text-emerald-600" />
                    Trạng thái: hợp lệ
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 print:hidden sm:p-5">
        <p className="font-medium text-slate-800">Mẹo sử dụng chứng chỉ</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <p className="flex items-center gap-2">
            <BookOpen className="size-4 text-[#2f57ef]" />
            Thêm chứng chỉ vào hồ sơ học tập và CV để tăng độ tin cậy.
          </p>
          <p className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-600" />
            Dùng mã xác thực để nhà tuyển dụng kiểm tra tính hợp lệ.
          </p>
        </div>
      </div>
    </div>
  );
}
