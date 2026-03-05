import { requireAuth } from "@/lib/dal";
import { getUserById } from "@/lib/queries/admin";
import { getAssetUrl, directusUrl } from "@/lib/directus";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Globe,
  Star,
} from "lucide-react";
import { UserDetailActions } from "./user-detail-actions";
import type { Metadata } from "next";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Chi tiết người dùng - Quản trị",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

type EnrollmentWithCourse = {
  id: string;
  enrolled_at: string;
  status: string;
  progress_percentage: number | null;
  status_for_display?: string;
  course_id: {
    id: string;
    title: string;
    slug: string;
    thumbnail?: string | null;
    total_lessons?: number | null;
  } | null;
};

type CountResult = {
  map: Map<string, number>;
  success: boolean;
};

async function getCompletedLessonsByEnrollment(
  enrollmentIds: string[],
  token: string
): Promise<CountResult> {
  if (enrollmentIds.length === 0) {
    return { map: new Map(), success: true };
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const result: CountResult = { map: new Map(), success: false };

  try {
    const res = await fetch(
      `${directusUrl}/items/progress?filter[enrollment_id][_in]=${enrollmentIds.join(",")}&filter[completed][_eq]=true&groupBy[]=enrollment_id&aggregate[count]=id`,
      { headers, next: { revalidate: 0 } }
    );

    if (!res.ok) return result;

    const data = await res.json();
    for (const item of data.data ?? []) {
      const enrollmentId =
        item.enrollment_id?.id ??
        item.enrollment_id ??
        item["enrollment_id"];

      const count = Number(item.count?.id ?? 0);
      if (enrollmentId) {
        result.map.set(String(enrollmentId), count);
      }
    }

    result.success = true;
  } catch {
    // ignore
  }

  return result;
}

async function getLessonCountsByCourse(
  courseIds: string[],
  token: string
): Promise<CountResult> {
  if (courseIds.length === 0) {
    return { map: new Map(), success: true };
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const result: CountResult = { map: new Map(), success: false };
  const uniqueCourseIds = Array.from(
    new Set(courseIds.map((id) => String(id)).filter(Boolean))
  );

  try {
    const res = await fetch(
      `${directusUrl}/items/modules?filter[course_id][_in]=${uniqueCourseIds.join(",")}&fields=course_id,lessons.id&deep[lessons][_filter][status][_eq]=published&limit=-1`,
      { headers, next: { revalidate: 0 } }
    );

    if (!res.ok) return result;

    const data = await res.json();
    for (const moduleRow of data.data ?? []) {
      const courseId = moduleRow.course_id?.id ?? moduleRow.course_id;
      if (!courseId) continue;

      const key = String(courseId);
      const lessons = Array.isArray(moduleRow.lessons) ? moduleRow.lessons : [];
      result.map.set(key, (result.map.get(key) ?? 0) + lessons.length);
    }

    result.success = true;
    return result;
  } catch {
    // ignore
  }

  return result;
}

async function withActualProgress(
  enrollments: EnrollmentWithCourse[],
  token: string
): Promise<EnrollmentWithCourse[]> {
  if (enrollments.length === 0) return [];

  const enrollmentIds = enrollments.map((e) => e.id).filter(Boolean);
  const courseIds = enrollments
    .map((e) =>
      e.course_id && typeof e.course_id === "object" ? e.course_id.id : null
    )
    .filter(Boolean) as string[];

  const [completedResult, lessonResult] = await Promise.all([
    getCompletedLessonsByEnrollment(enrollmentIds, token),
    getLessonCountsByCourse(courseIds, token),
  ]);

  return enrollments.map((enrollment) => {
    const course = enrollment.course_id;
    const courseId = course && typeof course === "object" ? course.id : null;

    const totalLessons =
      (courseId && lessonResult.success
        ? lessonResult.map.get(courseId)
        : undefined) ??
      (course && typeof course === "object"
        ? Number(course.total_lessons ?? 0)
        : 0);

    const completedLessons =
      completedResult.map.has(enrollment.id)
        ? completedResult.map.get(enrollment.id) ?? 0
        : completedResult.success
          ? 0
          : null;

    const storedProgress = Number(enrollment.progress_percentage ?? 0);

    const computedProgress =
      completedLessons !== null &&
      totalLessons > 0 &&
      Number.isFinite(totalLessons)
        ? Math.min(100, Math.round((completedLessons / totalLessons) * 100))
        : null;

    const finalProgress =
      computedProgress !== null && Number.isFinite(computedProgress)
        ? computedProgress
        : Math.round(storedProgress);

    const statusForDisplay =
      computedProgress !== null && Number.isFinite(computedProgress)
        ? computedProgress >= 100
          ? "completed"
          : "active"
        : enrollment.status;

    return {
      ...enrollment,
      progress_percentage: finalProgress,
      status_for_display: statusForDisplay,
    };
  });
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { token } = await requireAuth();

  const user = await getUserById(token, id);
  if (!user) notFound();

  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email;

  const role = user.role;
  const roleName =
    typeof role === "object" && role?.name
      ? role.name.toLowerCase() === "administrator"
        ? "Admin"
        : role.name
      : "Học viên";

  // Fetch enrollments for the user
  const enrollmentsRes = await fetch(
    `${directusUrl}/items/enrollments?filter[user_id][_eq]=${id}&fields=id,enrolled_at,status,progress_percentage,course_id.id,course_id.title,course_id.slug,course_id.thumbnail,course_id.total_lessons&sort=-enrolled_at&limit=50`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    }
  );
  const enrollmentsRaw: EnrollmentWithCourse[] = enrollmentsRes.ok
    ? (await enrollmentsRes.json()).data ?? []
    : [];
  const enrollments = await withActualProgress(enrollmentsRaw, token);

  // Fetch courses created by user (if instructor)
  const instructorCoursesRes = await fetch(
    `${directusUrl}/items/courses?filter[instructors][user_id][_eq]=${id}&fields=id,title,slug,thumbnail,status,total_enrollments,average_rating&sort=-date_created&limit=50`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    }
  );
  const instructorCourses = instructorCoursesRes.ok
    ? (await instructorCoursesRes.json()).data ?? []
    : [];

  // Fetch user reviews
  const reviewsRes = await fetch(
    `${directusUrl}/items/reviews?filter[user_id][_eq]=${id}&fields=id,rating,comment,status,date_created,course_id.id,course_id.title&sort=-date_created&limit=20`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    }
  );
  const reviews = reviewsRes.ok ? (await reviewsRes.json()).data ?? [] : [];

  // Fetch user quiz attempts
  const attemptsRes = await fetch(
    `${directusUrl}/items/quiz_attempts?filter[user_id][_eq]=${id}&fields=id,score,is_passed,started_at,completed_at,quiz_id.id,quiz_id.title&sort=-started_at&limit=20`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    }
  );
  const quizAttempts = attemptsRes.ok
    ? (await attemptsRes.json()).data ?? []
    : [];

  const socialLinks: Record<string, string> = (user.social_links ?? {}) as Record<string, string>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/users">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Quay lại
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center p-6 text-center">
            <Avatar className="h-24 w-24">
              <AvatarImage src={getAssetUrl(user.avatar)} alt={displayName} />
              <AvatarFallback className="text-2xl">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h2 className="mt-4 text-xl font-bold">{displayName}</h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {user.headline && (
              <p className="mt-1 text-sm text-muted-foreground">
                {user.headline}
              </p>
            )}
            <div className="mt-3 flex gap-2">
              {roleName === "Admin" ? (
                <Badge className="bg-red-100 text-red-700">Admin</Badge>
              ) : roleName.toLowerCase() === "instructor" ? (
                <Badge className="bg-blue-100 text-blue-700">
                  Giảng viên
                </Badge>
              ) : (
                <Badge className="bg-green-100 text-green-700">
                  Học viên
                </Badge>
              )}
              {user.status === "active" ? (
                <Badge className="bg-emerald-100 text-emerald-700">
                  Hoạt động
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-700">
                  Vô hiệu hoá
                </Badge>
              )}
            </div>

            <Separator className="my-4 w-full" />

            <div className="w-full space-y-3 text-left text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{user.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  Tham gia{" "}
                  {user.date_created
                    ? format(new Date(user.date_created), "dd/MM/yyyy", {
                        locale: vi,
                      })
                    : "---"}
                </span>
              </div>
              {Object.keys(socialLinks).length > 0 && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  <div className="space-x-2">
                    {Object.entries(socialLinks).map(([key, val]) => (
                      <a
                        key={key}
                        href={val}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {key}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Separator className="my-4 w-full" />

            <UserDetailActions userId={user.id} currentStatus={user.status} currentRoleId={typeof role === "object" ? role?.id : ""} />
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="info">
            <TabsList>
              <TabsTrigger value="info">Thông tin</TabsTrigger>
              <TabsTrigger value="courses">Khoá học</TabsTrigger>
              <TabsTrigger value="activity">Hoạt động</TabsTrigger>
            </TabsList>

            {/* Info Tab */}
            <TabsContent value="info" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Thông tin chi tiết</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Họ và tên
                    </p>
                    <p className="mt-1">{displayName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Email
                    </p>
                    <p className="mt-1">{user.email}</p>
                  </div>
                  {user.phone && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Số điện thoại
                      </p>
                      <p className="mt-1">{user.phone}</p>
                    </div>
                  )}
                  {user.headline && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Tiêu đề
                      </p>
                      <p className="mt-1">{user.headline}</p>
                    </div>
                  )}
                  {user.bio && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Giới thiệu
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">{user.bio}</p>
                    </div>
                  )}
                  {Object.keys(socialLinks).length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Liên kết xã hội
                      </p>
                      <div className="mt-1 space-y-1">
                        {Object.entries(socialLinks).map(([key, val]) => (
                          <div key={key}>
                            <span className="font-medium capitalize">{key}:</span>{" "}
                            <a
                              href={val}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {val}
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Courses Tab */}
            <TabsContent value="courses" className="mt-4 space-y-4">
              {/* Enrolled Courses */}
              {enrollments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Khoá học đã ghi danh</CardTitle>
                    <CardDescription>
                      {enrollments.length} khoá học
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Khoá học</TableHead>
                          <TableHead>Trạng thái</TableHead>
                          <TableHead>Tiến độ</TableHead>
                          <TableHead>Ngày ghi danh</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {enrollments.map((e: EnrollmentWithCourse) => (
                          <TableRow key={e.id}>
                            <TableCell className="font-medium">
                              {e.course_id?.title ?? "---"}
                            </TableCell>
                            <TableCell>
                              {(e.status_for_display ?? e.status) === "active" ? (
                                <Badge className="bg-blue-100 text-blue-700">
                                  Đang học
                                </Badge>
                              ) : (e.status_for_display ?? e.status) === "completed" ? (
                                <Badge className="bg-green-100 text-green-700">
                                  Hoàn thành
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  Đã dừng
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress
                                  value={e.progress_percentage ?? 0}
                                  className="h-2 w-20"
                                />
                                <span className="text-xs text-muted-foreground">
                                  {Math.round(e.progress_percentage ?? 0)}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(e.enrolled_at), "dd/MM/yyyy", {
                                locale: vi,
                              })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Instructor Courses */}
              {instructorCourses.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Khoá học giảng dạy</CardTitle>
                    <CardDescription>
                      {instructorCourses.length} khoá học
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tên khoá học</TableHead>
                          <TableHead>Trạng thái</TableHead>
                          <TableHead>Học viên</TableHead>
                          <TableHead>Đánh giá</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {instructorCourses.map(
                          (c: {
                            id: number;
                            title: string;
                            status: string;
                            total_enrollments: number;
                            average_rating: number;
                          }) => (
                            <TableRow key={c.id}>
                              <TableCell className="font-medium">
                                {c.title}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    c.status === "published"
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {c.status === "published"
                                    ? "Đã xuất bản"
                                    : c.status === "review"
                                      ? "Chờ duyệt"
                                      : c.status === "draft"
                                        ? "Bản nháp"
                                        : "Lưu trữ"}
                                </Badge>
                              </TableCell>
                              <TableCell>{c.total_enrollments ?? 0}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                  <span className="text-sm">
                                    {Number(c.average_rating ?? 0).toFixed(1)}
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {enrollments.length === 0 && instructorCourses.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Người dùng chưa có khoá học nào.
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="mt-4 space-y-4">
              {/* Quiz Attempts */}
              {quizAttempts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Bài kiểm tra</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Bài quiz</TableHead>
                          <TableHead>Điểm</TableHead>
                          <TableHead>Kết quả</TableHead>
                          <TableHead>Thời gian</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {quizAttempts.map(
                          (a: {
                            id: number;
                            score: number;
                            is_passed: boolean;
                            started_at: string;
                            quiz_id: { id: number; title: string } | null;
                          }) => (
                            <TableRow key={a.id}>
                              <TableCell className="font-medium">
                                {a.quiz_id && typeof a.quiz_id === "object"
                                  ? a.quiz_id.title
                                  : "---"}
                              </TableCell>
                              <TableCell>{a.score}</TableCell>
                              <TableCell>
                                {a.is_passed ? (
                                  <Badge className="bg-green-100 text-green-700">
                                    Đạt
                                  </Badge>
                                ) : (
                                  <Badge className="bg-red-100 text-red-700">
                                    Không đạt
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {format(
                                  new Date(a.started_at),
                                  "dd/MM/yyyy HH:mm",
                                  { locale: vi }
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Reviews */}
              {reviews.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Đánh giá</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {reviews.map(
                        (r: {
                          id: number;
                          rating: number;
                          comment: string | null;
                          status: string;
                          date_created: string;
                          course_id: { id: number; title: string };
                        }) => (
                          <div
                            key={r.id}
                            className="rounded-lg border p-4"
                          >
                            <div className="flex items-center justify-between">
                              <p className="font-medium">
                                {r.course_id?.title ?? "---"}
                              </p>
                              <div className="flex items-center gap-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-3.5 w-3.5 ${
                                      i < r.rating
                                        ? "fill-yellow-400 text-yellow-400"
                                        : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            {r.comment && (
                              <p className="mt-2 text-sm text-muted-foreground">
                                {r.comment}
                              </p>
                            )}
                            <div className="mt-2 flex items-center gap-2">
                              <Badge
                                variant={
                                  r.status === "approved"
                                    ? "default"
                                    : r.status === "hidden"
                                      ? "destructive"
                                      : "secondary"
                                }
                              >
                                {r.status === "approved"
                                  ? "Đã duyệt"
                                  : r.status === "hidden"
                                    ? "Đã ẩn"
                                    : "Chờ duyệt"}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(
                                  new Date(r.date_created),
                                  "dd/MM/yyyy",
                                  { locale: vi }
                                )}
                              </span>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {quizAttempts.length === 0 && reviews.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Chưa có hoạt động nào.
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
