import { requireAuth } from "@/lib/dal";
import { directusUrl, getAssetUrl } from "@/lib/directus";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft,
  PlayCircle,
  FileText,
  Star,
  Clock,
  BookOpen,
  Users,
  BarChart3,
} from "lucide-react";
import { CourseDetailActions } from "./course-detail-actions";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chi tiết khoá học - Quản trị",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

const levelLabels: Record<string, string> = {
  beginner: "Cơ bản",
  intermediate: "Trung cấp",
  advanced: "Nâng cao",
};

const statusLabels: Record<string, string> = {
  draft: "Bản nháp",
  review: "Chờ duyệt",
  published: "Đã xuất bản",
  archived: "Lưu trữ",
};

function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours} giờ ${minutes} phút`;
  return `${minutes} phút`;
}

export default async function AdminCourseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { token } = await requireAuth();

  const res = await fetch(
    `${directusUrl}/items/courses/${id}?fields=*,category_id.id,category_id.name,instructors.user_id.id,instructors.user_id.first_name,instructors.user_id.last_name,instructors.user_id.email,instructors.user_id.avatar,modules.id,modules.title,modules.sort,modules.lessons.id,modules.lessons.title,modules.lessons.type,modules.lessons.duration,modules.lessons.is_free,modules.lessons.sort,modules.lessons.status,reviews.id,reviews.rating,reviews.comment,reviews.status,reviews.date_created,reviews.user_id.first_name,reviews.user_id.last_name`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) notFound();

  const courseData = await res.json();
  const course = courseData.data;
  if (!course) notFound();

  const instructors = (course.instructors ?? [])
    .map((ci: { user_id: unknown }) => ci.user_id)
    .filter((u: unknown) => u && typeof u === "object");

  const sortedModules = (course.modules ?? [])
    .sort((a: { sort: number }, b: { sort: number }) => a.sort - b.sort)
    .map((mod: { lessons?: Array<{ sort: number; status: string }> }) => ({
      ...mod,
      lessons: (mod.lessons ?? []).sort((a, b) => a.sort - b.sort),
    }));

  const totalLessons = sortedModules.reduce(
    (acc: number, mod: { lessons: unknown[] }) => acc + mod.lessons.length,
    0
  );

  const reviews = course.reviews ?? [];
  const approvedReviews = reviews.filter(
    (r: { status: string }) => r.status === "approved"
  );
  const pendingReviews = reviews.filter(
    (r: { status: string }) => r.status === "pending"
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/courses">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Quay lại
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Course Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex gap-6">
                {course.thumbnail && (
                  <div className="relative h-32 w-48 shrink-0 overflow-hidden rounded-lg">
                    <Image
                      src={getAssetUrl(course.thumbnail)}
                      alt={course.title}
                      fill
                      className="object-cover"
                      sizes="192px"
                    />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        course.status === "published"
                          ? "default"
                          : course.status === "review"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {statusLabels[course.status] ?? course.status}
                    </Badge>
                    {course.is_featured && (
                      <Badge
                        variant="outline"
                        className="border-yellow-300 text-yellow-600"
                      >
                        <Star className="mr-1 h-3 w-3 fill-yellow-400" />
                        Nổi bật
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-xl font-bold">{course.title}</h1>
                  {course.description && (
                    <p className="text-sm text-muted-foreground">
                      {course.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <BarChart3 className="h-4 w-4" />
                      {levelLabels[course.level] ?? course.level}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      {totalLessons} bài học
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDuration(course.total_duration ?? 0)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {course.total_enrollments ?? 0} học viên
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Course Details */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin chi tiết</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Danh mục
                  </p>
                  <p className="mt-1">
                    {typeof course.category_id === "object"
                      ? course.category_id?.name
                      : "Chưa phân loại"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Ngôn ngữ
                  </p>
                  <p className="mt-1">{course.language || "Tiếng Việt"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Giá
                  </p>
                  <p className="mt-1">
                    {course.price === 0
                      ? "Miễn phí"
                      : formatPrice(course.price)}
                    {course.discount_price != null &&
                      course.discount_price < course.price && (
                        <span className="ml-2 text-sm text-muted-foreground line-through">
                          {formatPrice(course.price)}
                        </span>
                      )}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Đánh giá
                  </p>
                  <p className="mt-1 flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {Number(course.average_rating ?? 0).toFixed(1)} (
                    {approvedReviews.length} đánh giá)
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Ngày tạo
                  </p>
                  <p className="mt-1">
                    {course.date_created
                      ? format(new Date(course.date_created), "dd/MM/yyyy HH:mm", {
                          locale: vi,
                        })
                      : "---"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Cập nhật lần cuối
                  </p>
                  <p className="mt-1">
                    {course.date_updated
                      ? format(new Date(course.date_updated), "dd/MM/yyyy HH:mm", {
                          locale: vi,
                        })
                      : "---"}
                  </p>
                </div>
              </div>

              {course.promo_video_url && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Video giới thiệu
                    </p>
                    <a
                      href={course.promo_video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {course.promo_video_url}
                    </a>
                  </div>
                </>
              )}

              {course.what_you_learn && course.what_you_learn.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Bạn sẽ học được gì
                    </p>
                    <ul className="space-y-1">
                      {course.what_you_learn.map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-green-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {course.requirements && course.requirements.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Yêu cầu
                    </p>
                    <ul className="space-y-1">
                      {course.requirements.map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-foreground" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Course Content / Curriculum */}
          {sortedModules.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Nội dung khoá học</CardTitle>
                <CardDescription>
                  {sortedModules.length} chương, {totalLessons} bài học
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion
                  type="multiple"
                  defaultValue={sortedModules.map((m: { id: string }) =>
                    String(m.id)
                  )}
                  className="space-y-2"
                >
                  {sortedModules.map(
                    (mod: {
                      id: string;
                      title: string;
                      lessons: Array<{
                        id: string;
                        title: string;
                        type: string;
                        duration: number;
                        is_free: boolean;
                        status: string;
                      }>;
                    }) => (
                      <AccordionItem
                        key={mod.id}
                        value={String(mod.id)}
                        className="rounded-lg border px-4"
                      >
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-2 text-left">
                            <span className="font-medium">{mod.title}</span>
                            <span className="text-xs text-muted-foreground">
                              ({mod.lessons.length} bài học)
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <ul className="space-y-1">
                            {mod.lessons.map((lesson) => (
                              <li
                                key={lesson.id}
                                className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted/50"
                              >
                                <div className="flex items-center gap-2">
                                  {lesson.type === "video" ? (
                                    <PlayCircle className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  <span>{lesson.title}</span>
                                  {lesson.is_free && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] px-1.5 py-0"
                                    >
                                      Xem trước
                                    </Badge>
                                  )}
                                  {lesson.status === "draft" && (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                      Nháp
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {Math.floor(lesson.duration / 60)}:
                                  {String(lesson.duration % 60).padStart(2, "0")}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    )
                  )}
                </Accordion>
              </CardContent>
            </Card>
          )}

          {/* Reviews Summary */}
          {reviews.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Đánh giá</CardTitle>
                <CardDescription>
                  {approvedReviews.length} đã duyệt, {pendingReviews.length}{" "}
                  chờ duyệt
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reviews.slice(0, 10).map(
                    (review: {
                      id: string;
                      rating: number;
                      comment: string | null;
                      status: string;
                      date_created: string;
                      user_id: {
                        first_name: string | null;
                        last_name: string | null;
                      };
                    }) => (
                      <div key={review.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3 w-3 ${
                                    i < review.rating
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm font-medium">
                              {[
                                review.user_id?.first_name,
                                review.user_id?.last_name,
                              ]
                                .filter(Boolean)
                                .join(" ") || "Ẩn danh"}
                            </span>
                          </div>
                          <Badge
                            variant={
                              review.status === "approved"
                                ? "default"
                                : review.status === "rejected"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {review.status === "approved"
                              ? "Đã duyệt"
                              : review.status === "rejected"
                                ? "Đã từ chối"
                                : "Chờ duyệt"}
                          </Badge>
                        </div>
                        {review.comment && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {review.comment}
                          </p>
                        )}
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Hành động</CardTitle>
            </CardHeader>
            <CardContent>
              <CourseDetailActions
                courseId={course.id}
                currentStatus={course.status}
                isFeatured={course.is_featured}
              />
            </CardContent>
          </Card>

          {/* Instructors Card */}
          {instructors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Giảng viên</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {instructors.map(
                  (inst: {
                    id: string;
                    first_name: string | null;
                    last_name: string | null;
                    email: string;
                    avatar: string | null;
                  }) => (
                    <Link
                      key={inst.id}
                      href={`/admin/users/${inst.id}`}
                      className="flex items-center gap-3 rounded-md p-2 hover:bg-muted"
                    >
                      <div className="flex size-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
                        {(inst.first_name?.[0] ?? "") +
                          (inst.last_name?.[0] ?? "")}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {[inst.first_name, inst.last_name]
                            .filter(Boolean)
                            .join(" ") || inst.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {inst.email}
                        </p>
                      </div>
                    </Link>
                  )
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
