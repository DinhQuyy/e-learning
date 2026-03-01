import { requireRole, getUserDisplayName } from "@/lib/dal";
import {
  getInstructorCourses,
  getInstructorStats,
  getRecentEnrollments,
  getRatingDistribution,
} from "@/lib/queries/instructor";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = 'force-dynamic';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  BookOpen,
  Users,
  Star,
  DollarSign,
} from "lucide-react";
import { getAssetUrl } from "@/lib/directus";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import type { DirectusUser, Course } from "@/types";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function InstructorDashboard() {
  const { token, user } = await requireRole(["instructor"]);
  const displayName = getUserDisplayName(user);
  const stats = await getInstructorStats(token);
  const courses = await getInstructorCourses(token);
  const courseIds = courses.map((c) => c.id);
  const recentEnrollments = await getRecentEnrollments(token, courseIds, 10);

  // Aggregate rating distribution across all courses
  const allRatingDistributions = await Promise.all(
    courseIds.map((id) => getRatingDistribution(token, id))
  );
  const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const dist of allRatingDistributions) {
    for (const key of [1, 2, 3, 4, 5] as const) {
      ratingDistribution[key] += dist[key] ?? 0;
    }
  }
  const totalRatings = Object.values(ratingDistribution).reduce(
    (a, b) => a + b,
    0
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Dashboard Giảng viên
        </h1>
        <p className="text-muted-foreground">
          Xin chào, {displayName}! Đây là tổng quan hoạt động của bạn.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Tổng khoá học</CardDescription>
            <BookOpen className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCourses}</div>
            <p className="text-xs text-muted-foreground">khoá học đã tạo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Tổng học viên</CardDescription>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">học viên đã đăng ký</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Đánh giá trung bình</CardDescription>
            <Star className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.averageRating > 0
                ? stats.averageRating.toFixed(1)
                : "--"}
            </div>
            <p className="text-xs text-muted-foreground">
              trên thang 5 sao
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Doanh thu</CardDescription>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">ước tính tổng doanh thu</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Enrollments Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Đăng ký gần đây</CardTitle>
            <CardDescription>
              Học viên mới đăng ký các khoá học của bạn
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentEnrollments.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                Chưa có học viên đăng ký
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Học viên</TableHead>
                    <TableHead>Khoá học</TableHead>
                    <TableHead>Ngày đăng ký</TableHead>
                    <TableHead>Tiến độ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentEnrollments.map((enrollment) => {
                    const student = enrollment.user_id as DirectusUser;
                    const course = enrollment.course_id as Course;
                    const studentName =
                      student && typeof student === "object"
                        ? [student.first_name, student.last_name]
                            .filter(Boolean)
                            .join(" ") || student.email
                        : "Học viên";
                    const studentInitials =
                      student && typeof student === "object"
                        ? [student.first_name?.[0], student.last_name?.[0]]
                            .filter(Boolean)
                            .join("")
                            .toUpperCase() || student.email[0].toUpperCase()
                        : "HV";
                    const studentAvatar =
                      student && typeof student === "object" ? student.avatar : null;

                    return (
                      <TableRow key={enrollment.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="size-8">
                              <AvatarImage
                                src={getAssetUrl(studentAvatar)}
                                alt={studentName}
                              />
                              <AvatarFallback className="text-xs">
                                {studentInitials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">
                              {studentName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {typeof course === "object"
                              ? course.title
                              : `Khoá học #${course}`}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {format(
                              new Date(enrollment.enrolled_at),
                              "dd/MM/yyyy",
                              { locale: vi }
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={enrollment.progress_percentage}
                              className="h-2 w-16"
                            />
                            <span className="text-xs text-muted-foreground">
                              {Math.round(enrollment.progress_percentage)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Rating Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Phân bố đánh giá</CardTitle>
            <CardDescription>
              {totalRatings > 0
                ? `Tổng ${totalRatings} đánh giá`
                : "Chưa có đánh giá"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = ratingDistribution[star] ?? 0;
                const percentage =
                  totalRatings > 0
                    ? Math.round((count / totalRatings) * 100)
                    : 0;
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="w-8 text-sm font-medium text-right">
                      {star}
                      <Star className="inline ml-0.5 size-3 text-yellow-500 fill-yellow-500" />
                    </span>
                    <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-yellow-500 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-10 text-xs text-muted-foreground text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
