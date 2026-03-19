import { requireAuth } from "@/lib/dal";
import { getReportData, getRevenueStats } from "@/lib/queries/admin";
import { getAssetUrl } from "@/lib/directus";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Trophy, DollarSign } from "lucide-react";
import type { Metadata } from "next";
import {
  EnrollmentTrendChart,
  RatingDistributionChart,
} from "./report-charts";
import { ReportFilters } from "./report-filters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Báo cáo & Thống kê - Quản trị",
};

const numberFormatter = new Intl.NumberFormat("vi-VN");
const priceFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

interface PageProps {
  searchParams: Promise<{
    from?: string;
    to?: string;
  }>;
}

export default async function AdminReportsPage({ searchParams }: PageProps) {
  const { token } = await requireAuth();
  const params = await searchParams;
  const from = params.from || "";
  const to = params.to || "";

  const [reportData, revenueStats] = await Promise.all([
    getReportData(token),
    getRevenueStats(token, from, to),
  ]);

  // Process enrollment trends by month (last 6 months)
  const now = new Date();
  const monthlyEnrollments: { month: string; count: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);

    const count = reportData.enrollments.filter(
      (e: { enrolled_at: string }) => {
        const d = new Date(e.enrolled_at);
        return d >= start && d <= end;
      }
    ).length;

    monthlyEnrollments.push({
      month: format(monthDate, "MMM yy", { locale: vi }),
      count,
    });
  }

  // Rating distribution
  const totalReviews = reportData.ratingDistribution.reduce(
    (sum: number, r: { count: number }) => sum + r.count,
    0
  );

  const ratingChartData = [5, 4, 3, 2, 1].map((rating) => {
    const ratingData = reportData.ratingDistribution.find(
      (r: { rating: number }) => r.rating === rating
    );
    const count = ratingData?.count ?? 0;
    return {
      rating,
      count,
      percentage: totalReviews > 0 ? (count / totalReviews) * 100 : 0,
    };
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Báo cáo & Thống kê
        </h1>
        <p className="text-gray-500">
          Phân tích dữ liệu và xu hướng của nền tảng
        </p>
      </div>

      <ReportFilters from={from} to={to} />

      {/* Revenue Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-50 p-2.5 dark:bg-emerald-950/30">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Tổng doanh thu</p>
                <p className="text-xl font-bold">
                  {priceFormatter.format(revenueStats.totalRevenue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-50 p-2.5 dark:bg-blue-950/30">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Tháng này</p>
                <p className="text-xl font-bold">
                  {priceFormatter.format(revenueStats.currentMonthRevenue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-gray-50 p-2.5 dark:bg-gray-950/30">
                <DollarSign className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Tháng trước</p>
                <p className="text-xl font-bold">
                  {priceFormatter.format(revenueStats.lastMonthRevenue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-50 p-2.5 dark:bg-purple-950/30">
                <Star className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Tổng đơn hàng</p>
                <p className="text-xl font-bold">
                  {numberFormatter.format(revenueStats.totalOrders)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <EnrollmentTrendChart data={monthlyEnrollments} />
        <RatingDistributionChart
          data={ratingChartData}
          totalReviews={totalReviews}
        />
      </div>

      {/* Tables Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Popular Courses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Khóa học phổ biến nhất
            </CardTitle>
            <CardDescription>
              Top 10 khóa học theo số lượng ghi danh
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reportData.popularCourses.length === 0 ? (
              <p className="py-8 text-center text-gray-500">
                Chưa có dữ liệu.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Tiêu đề</TableHead>
                    <TableHead>Ghi danh</TableHead>
                    <TableHead>Đánh giá</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.popularCourses.map(
                    (
                      course: {
                        id: string;
                        title: string;
                        total_enrollments: number;
                        average_rating: number;
                      },
                      index: number
                    ) => (
                      <TableRow key={course.id}>
                        <TableCell className="font-bold text-gray-500">
                          {index + 1}
                        </TableCell>
                        <TableCell className="max-w-48 truncate font-medium">
                          {course.title}
                        </TableCell>
                        <TableCell>
                          {numberFormatter.format(
                            course.total_enrollments ?? 0
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm">
                              {Number(course.average_rating ?? 0).toFixed(1)}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Top Instructors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Giảng viên xuất sắc
            </CardTitle>
            <CardDescription>
              Top 10 giảng viên theo số lượng học viên
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reportData.topInstructors.length === 0 ? (
              <p className="py-8 text-center text-gray-500">
                Chưa có dữ liệu.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Giảng viên</TableHead>
                    <TableHead>Khóa học</TableHead>
                    <TableHead>Học viên</TableHead>
                    <TableHead>TB</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.topInstructors.map(
                    (
                      instructor: {
                        id: string;
                        name: string;
                        avatar: string | null;
                        coursesCount: number;
                        totalStudents: number;
                        avgRating: number;
                      },
                      index: number
                    ) => (
                      <TableRow key={instructor.id}>
                        <TableCell className="font-bold text-gray-500">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarImage
                                src={getAssetUrl(instructor.avatar)}
                                alt={instructor.name}
                              />
                              <AvatarFallback className="text-xs">
                                {instructor.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">
                              {instructor.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{instructor.coursesCount}</TableCell>
                        <TableCell>
                          {numberFormatter.format(instructor.totalStudents)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm">
                              {instructor.avgRating.toFixed(1)}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
