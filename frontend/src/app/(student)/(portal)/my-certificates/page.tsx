import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Award, ExternalLink, Eye, FileCheck2 } from "lucide-react";
import { requireAuth } from "@/lib/dal";
import { getAssetUrl } from "@/lib/directus";
import { getUserCertificates } from "@/lib/queries/certificates";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Certificate, Course } from "@/types";
import { DeleteCertificateButton } from "./delete-certificate-button";

export const dynamic = "force-dynamic";

function resolveCourse(certificate: Certificate): Course | null {
  if (!certificate.course_id || typeof certificate.course_id === "string") {
    return null;
  }
  return certificate.course_id as Course;
}

function resolveEnrollmentId(certificate: Certificate): string {
  if (
    certificate.enrollment_id &&
    typeof certificate.enrollment_id === "object"
  ) {
    const enrollment = certificate.enrollment_id as { id?: unknown };
    if (typeof enrollment.id === "string") {
      return enrollment.id;
    }
  }

  if (typeof certificate.enrollment_id === "string") {
    return certificate.enrollment_id;
  }

  return "";
}

export default async function MyCertificatesPage() {
  const { token, user } = await requireAuth();
  const certificates = await getUserCertificates(token, user.id);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Chứng chỉ của tôi</h1>
        <p className="text-muted-foreground">
          Danh sách chứng chỉ đã được cấp sau khi hoàn thành khóa học.
        </p>
      </div>

      {certificates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <Award className="mb-3 size-10 text-muted-foreground" />
            <p className="font-medium">Bạn chưa có chứng chỉ nào.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Hoàn thành 100% nội dung khóa học để hệ thống cấp chứng chỉ tự động.
            </p>
            <Button className="mt-4" asChild>
              <Link href="/my-courses">Đến khóa học của tôi</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {certificates.map((certificate) => {
            const course = resolveCourse(certificate);
            const enrollmentId = resolveEnrollmentId(certificate);
            const issuedAtSource = certificate.issued_at ?? certificate.date_created;
            const issuedAtLabel = issuedAtSource
              ? format(new Date(issuedAtSource), "dd/MM/yyyy", { locale: vi })
              : "N/A";

            return (
              <Card key={certificate.id} className="overflow-hidden py-0 gap-0">
                <div className="relative aspect-video w-full overflow-hidden">
                  {course?.thumbnail ? (
                    <Image
                      src={getAssetUrl(course.thumbnail)}
                      alt={course.title ?? "Course thumbnail"}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center bg-muted text-muted-foreground">
                      <FileCheck2 className="size-8" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <Badge className="absolute bottom-2 left-2">
                    <Award className="mr-1 size-3" />
                    Đã cấp
                  </Badge>
                </div>

                <CardHeader className="space-y-2 p-4">
                  <CardTitle className="line-clamp-2 text-base leading-snug">
                    {course?.title ?? "Khóa học không còn khả dụng"}
                  </CardTitle>
                  <CardDescription>Cấp ngày {issuedAtLabel}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 p-4 pt-0">
                  <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs">
                    <p className="text-muted-foreground">Mã chứng chỉ</p>
                    <p className="mt-0.5 font-mono font-medium break-all">
                      {certificate.certificate_code}
                    </p>
                  </div>

                  <div className="grid gap-2">
                    {enrollmentId ? (
                      <Button asChild className="w-full" size="sm">
                        <Link href={`/my-certificates/enrollment/${enrollmentId}`}>
                          <Eye className="mr-1 size-4" />
                          Xem chứng chỉ
                        </Link>
                      </Button>
                    ) : null}

                    {course?.slug ? (
                      <Button asChild variant="outline" className="w-full" size="sm">
                        <Link href={`/learn/${course.slug}`}>
                          Xem khóa học
                          <ExternalLink className="ml-1 size-4" />
                        </Link>
                      </Button>
                    ) : (
                      <Button className="w-full" size="sm" disabled>
                        Khóa học không khả dụng
                      </Button>
                    )}

                    <DeleteCertificateButton
                      certificateId={certificate.id}
                      courseTitle={course?.title}
                      className="w-full"
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
