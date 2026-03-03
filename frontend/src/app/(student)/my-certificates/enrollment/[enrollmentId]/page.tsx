import Link from "next/link";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { ArrowLeft, BadgeCheck, ExternalLink } from "lucide-react";
import { requireAuth } from "@/lib/dal";
import { getUserCertificateByEnrollmentId } from "@/lib/queries/certificates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Certificate, Course, DirectusUser } from "@/types";
import { PrintCertificateButton } from "./print-certificate-button";

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
          <PrintCertificateButton />
        </div>
      </div>

      <Card className="mx-auto w-full max-w-5xl rounded-[24px] border border-zinc-200 bg-zinc-50/80 py-0 shadow-sm print:rounded-none print:border-zinc-300 print:shadow-none">
        <CardHeader className="space-y-3 p-6 sm:p-7">
          <Badge
            variant="secondary"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-300 bg-white/80 px-3 py-1 text-xs text-zinc-800"
          >
            <BadgeCheck className="size-3.5 text-primary" />
            Mẫu hiển thị chứng chỉ
          </Badge>
          <CardTitle className="text-4xl font-semibold tracking-tight text-zinc-900">
            Certificate of Completion
          </CardTitle>
          <CardDescription className="text-lg text-zinc-600">
            Đây là bố cục minh họa để bạn hình dung chứng chỉ sau khi hoàn thành
            khóa học.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 pt-0 sm:p-7 sm:pt-0">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs sm:p-7">
            <p className="text-xs uppercase tracking-[0.42em] text-zinc-500">
              E-Learning Platform
            </p>
            <p className="mt-5 text-4xl font-semibold tracking-tight text-zinc-900">
              {learnerName}
            </p>
            <p className="mt-2 text-2xl text-zinc-700">Đã hoàn thành khóa học</p>
            <p className="mt-2 text-3xl font-medium text-zinc-900">
              {course?.title ?? "Khóa học"}
            </p>

            <div className="mt-8 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 sm:gap-10">
              <div>
                <p className="text-lg text-zinc-500">Ngày cấp</p>
                <p className="text-2xl font-semibold text-zinc-900">{issuedAtLabel}</p>
              </div>
              <div>
                <p className="text-lg text-zinc-500">Mã xác thực</p>
                <p className="break-all text-2xl font-semibold text-zinc-900">
                  {certificate.certificate_code}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
