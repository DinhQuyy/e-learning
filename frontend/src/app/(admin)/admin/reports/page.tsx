import { requireAuth } from "@/lib/dal";
import { getReportData } from "@/lib/queries/admin";
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
import { Progress } from "@/components/ui/progress";
import { Star, TrendingUp, Trophy, BarChart3 } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Báo cáo & Thống kê - Quản trị",
};

const numberFormatter = new Intl.NumberFormat("vi-VN");

export default async function AdminReportsPage() {
  const { token } = await requireAuth();
  const reportData = await getReportData(token);

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
      month: format(monthDate, "MMMM yyyy", { locale: vi }),
      count,
    });
  }

  const maxEnrollment = Math.max(...monthlyEnrollments.map((m) => m.count), 1);

  // Rating distribution
  const totalReviews = reportData.ratingDistribution.reduce(
    (sum: number, r: { count: number }) => sum + r.count,
    0
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Báo cáo & Thống kê
        </h1>
        <p className="text-muted-foreground">
          Phân tích dữ liệu và xu hướng của nền tảng
        </p>
      </div>

      {/* Enrollment Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Xu hướng ghi danh
          </CardTitle>
          <CardDescription>
            Số lượng ghi danh trong 6 tháng gần nhất
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tháng</TableHead>
                <TableHead>Số lượng</TableHead>
                <TableHead className="w-1/2">Biểu đồ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyEnrollments.map((item) => (
                <TableRow key={item.month}>
                  <TableCell className="font-medium capitalize">
                    {item.month}
                  </TableCell>
                  <TableCell>
                    {numberFormatter.format(item.count)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={(item.count / maxEnrollment) * 100}
                        className="h-3"
                      />
                      <span className="w-12 text-right text-xs text-muted-foreground">
                        {Math.round((item.count / maxEnrollment) * 100)}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Popular Courses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Khoá học phổ biến nhất
            </CardTitle>
            <CardDescription>
              Top 10 khoá học theo số lượng ghi danh
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reportData.popularCourses.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
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
                        id: number;
                        title: string;
                        total_enrollments: number;
                        average_rating: number;
                      },
                      index: number
                    ) => (
                      <TableRow key={course.id}>
                        <TableCell className="font-bold text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium">
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
              <p className="py-8 text-center text-muted-foreground">
                Chưa có dữ liệu.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Giảng viên</TableHead>
                    <TableHead>Khoá học</TableHead>
                    <TableHead>Học viên</TableHead>
                    <TableHead>TB đánh giá</TableHead>
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
                        <TableCell className="font-bold text-muted-foreground">
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

      {/* Rating Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Phân bố đánh giá
          </CardTitle>
          <CardDescription>
            Tổng quan đánh giá toàn nền tảng ({numberFormatter.format(totalReviews)}{" "}
            đánh giá đã duyệt)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((rating) => {
              const ratingData = reportData.ratingDistribution.find(
                (r: { rating: number }) => r.rating === rating
              );
              const count = ratingData?.count ?? 0;
              const percentage =
                totalReviews > 0 ? (count / totalReviews) * 100 : 0;

              return (
                <div key={rating} className="flex items-center gap-3">
                  <div className="flex w-20 items-center gap-1">
                    <span className="text-sm font-medium">{rating}</span>
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <Progress value={percentage} className="h-3" />
                  </div>
                  <div className="w-24 text-right">
                    <span className="text-sm font-medium">
                      {numberFormatter.format(count)}
                    </span>
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
