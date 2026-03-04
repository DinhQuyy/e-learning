import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { BookOpen, DollarSign, Star, Users } from "lucide-react";
import { getUserDisplayName, requireRole } from "@/lib/dal";
import { getAssetUrl } from "@/lib/directus";
import {
  getInstructorCourses,
  getInstructorStats,
  getRatingDistribution,
  getRecentEnrollments,
} from "@/lib/queries/instructor";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Course, DirectusUser } from "@/types";

export const dynamic = "force-dynamic";

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
  const courseIds = courses.map((course) => course.id);
  const recentEnrollments = await getRecentEnrollments(token, courseIds, 10);

  const allRatingDistributions = await Promise.all(
    courseIds.map((id) => getRatingDistribution(token, id)),
  );

  const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const distribution of allRatingDistributions) {
    for (const key of [1, 2, 3, 4, 5] as const) {
      ratingDistribution[key] += distribution[key] ?? 0;
    }
  }
  const totalRatings = Object.values(ratingDistribution).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.35)]">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2f57ef]">
          Bảng điều khiển giảng viên
        </p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">{displayName}</h2>
        <p className="mt-1 text-sm text-slate-500">
          Theo dõi tăng trưởng lớp học và hiệu suất khóa học của bạn.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl border-0 bg-gradient-to-br from-[#eef3ff] to-[#f5f8ff] shadow-[0_14px_30px_-24px_rgba(47,87,239,0.6)]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-600">Tổng khóa học</span>
              <BookOpen className="size-4 text-[#2f57ef]" />
            </div>
            <p className="mt-3 text-3xl font-extrabold text-slate-900">{stats.totalCourses}</p>
            <p className="mt-1 text-xs text-slate-500">khóa học đã tạo</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 bg-gradient-to-br from-[#ecfdf3] to-[#f4fff8] shadow-[0_14px_30px_-24px_rgba(16,185,129,0.55)]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-600">Tổng học viên</span>
              <Users className="size-4 text-emerald-600" />
            </div>
            <p className="mt-3 text-3xl font-extrabold text-slate-900">{stats.totalStudents}</p>
            <p className="mt-1 text-xs text-slate-500">học viên đã đăng ký</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 bg-gradient-to-br from-[#fff7e6] to-[#fffaf0] shadow-[0_14px_30px_-24px_rgba(245,158,11,0.55)]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-600">Đánh giá TB</span>
              <Star className="size-4 text-amber-500" />
            </div>
            <p className="mt-3 text-3xl font-extrabold text-slate-900">
              {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : "--"}
            </p>
            <p className="mt-1 text-xs text-slate-500">trên thang điểm 5</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 bg-gradient-to-br from-[#f6efff] to-[#fbf6ff] shadow-[0_14px_30px_-24px_rgba(185,102,231,0.55)]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-600">Doanh thu</span>
              <DollarSign className="size-4 text-[#a855f7]" />
            </div>
            <p className="mt-3 text-3xl font-extrabold text-slate-900">
              {formatCurrency(stats.totalRevenue)}
            </p>
            <p className="mt-1 text-xs text-slate-500">ước tính toàn bộ khóa học</p>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.35)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Đăng ký gần đây</h3>
              <p className="text-sm text-slate-500">
                Học viên mới đăng ký các khóa học của bạn
              </p>
            </div>
            <Badge variant="secondary">{recentEnrollments.length} bản ghi</Badge>
          </div>

          {recentEnrollments.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Chưa có học viên đăng ký.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Học viên</TableHead>
                    <TableHead>Khóa học</TableHead>
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
                              <AvatarImage src={getAssetUrl(studentAvatar)} alt={studentName} />
                              <AvatarFallback className="text-xs">{studentInitials}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{studentName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="line-clamp-2 text-sm">
                            {typeof course === "object"
                              ? course.title
                              : `Khóa học #${course}`}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-500">
                            {format(new Date(enrollment.enrolled_at), "dd/MM/yyyy", {
                              locale: vi,
                            })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={enrollment.progress_percentage} className="h-2 w-20" />
                            <span className="text-xs text-slate-500">
                              {Math.round(enrollment.progress_percentage)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.35)]">
          <h3 className="text-lg font-bold text-slate-900">Phân bố đánh giá</h3>
          <p className="mt-1 text-sm text-slate-500">
            {totalRatings > 0 ? `Tổng ${totalRatings} đánh giá` : "Chưa có đánh giá"}
          </p>

          <div className="mt-5 space-y-3">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratingDistribution[star] ?? 0;
              const percentage = totalRatings > 0 ? Math.round((count / totalRatings) * 100) : 0;

              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="w-8 text-right text-sm font-semibold text-slate-600">
                    {star}
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs text-slate-500">{count}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
