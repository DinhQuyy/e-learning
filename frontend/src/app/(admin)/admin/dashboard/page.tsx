import { requireAuth } from "@/lib/dal";
import { getAssetUrl } from "@/lib/directus";
import {
  getAdminStats,
  getLatestEnrollments,
  getLatestReviews,
  getRevenueStats,
  getEnrollmentTrend,
  getCourseStatusDistribution,
} from "@/lib/queries/admin";
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
import {
  Users,
  BookOpen,
  GraduationCap,
  Clock,
  Star,
  ArrowRight,
  UserPlus,
  CheckCircle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import Link from "next/link";
import type { Metadata } from "next";
import {
  RevenueChart,
  EnrollmentChart,
  CourseStatusChart,
} from "./dashboard-charts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tổng quan - Quản trị hệ thống",
};

const numberFormatter = new Intl.NumberFormat("vi-VN");
const priceFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export default async function AdminDashboardPage() {
  const { token } = await requireAuth();

  const [
    stats,
    latestEnrollments,
    latestReviews,
    revenueStats,
    enrollmentTrend,
    courseStatusDist,
  ] = await Promise.all([
    getAdminStats(token),
    getLatestEnrollments(token, 5),
    getLatestReviews(token, 5),
    getRevenueStats(token),
    getEnrollmentTrend(token),
    getCourseStatusDistribution(token),
  ]);

  const statCards = [
    {
      label: "Tổng doanh thu",
      value: priceFormatter.format(revenueStats.totalRevenue),
      subValue:
        revenueStats.revenueChange !== 0
          ? `${revenueStats.revenueChange > 0 ? "+" : ""}${revenueStats.revenueChange.toFixed(1)}% so với tháng trước`
          : "Chưa có dữ liệu so sánh",
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      trend: revenueStats.revenueChange,
      href: "/admin/orders",
    },
    {
      label: "Tổng người dùng",
      value: numberFormatter.format(stats.totalUsers),
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      href: "/admin/users",
    },
    {
      label: "Tổng khoá học",
      value: numberFormatter.format(stats.totalCourses),
      icon: BookOpen,
      color: "text-green-600",
      bg: "bg-green-50 dark:bg-green-950/30",
      href: "/admin/courses",
    },
    {
      label: "Tổng ghi danh",
      value: numberFormatter.format(stats.totalEnrollments),
      icon: GraduationCap,
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-950/30",
      href: "/admin/reports",
    },
    {
      label: "Doanh thu tháng này",
      value: priceFormatter.format(revenueStats.currentMonthRevenue),
      icon: ShoppingCart,
      color: "text-pink-600",
      bg: "bg-pink-50 dark:bg-pink-950/30",
      href: "/admin/orders",
    },
    {
      label: "Khoá học chờ duyệt",
      value: numberFormatter.format(stats.pendingCourses),
      icon: Clock,
      color: "text-orange-600",
      bg: "bg-orange-50 dark:bg-orange-950/30",
      href: "/admin/courses?status=review",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Tổng quan hệ thống
        </h1>
        <p className="text-gray-500">
          Theo dõi và quản lý nền tảng học trực tuyến của bạn.
        </p>
      </div>

      {/* Stats Grid — 6 cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        {stat.label}
                      </p>
                      <p className="mt-1 text-2xl font-bold">{stat.value}</p>
                      {stat.subValue && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                          {stat.trend !== undefined &&
                            stat.trend !== 0 &&
                            (stat.trend > 0 ? (
                              <TrendingUp className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-red-500" />
                            ))}
                          {stat.subValue}
                        </p>
                      )}
                    </div>
                    <div className={`rounded-full p-3 ${stat.bg}`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueChart data={revenueStats.monthlyChart} />
        <EnrollmentChart data={enrollmentTrend} />
      </div>

      {/* Course Status + Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CourseStatusChart data={courseStatusDist} />

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Thao tác nhanh</CardTitle>
            <CardDescription>
              Các hành động quản trị thường dùng
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-700">
                <Link href="/admin/users">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Quản lý người dùng
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-700">
                <Link href="/admin/courses?status=review">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Duyệt khoá học
                  {stats.pendingCourses > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {stats.pendingCourses}
                    </Badge>
                  )}
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-700">
                <Link href="/admin/reviews">
                  <Star className="mr-2 h-4 w-4" />
                  Kiểm duyệt đánh giá
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-700">
                <Link href="/admin/categories">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Quản lý danh mục
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-700">
                <Link href="/admin/orders">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Quản lý đơn hàng
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-700">
                <Link href="/admin/reports">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Xem báo cáo
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Latest Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Latest Enrollments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Ghi danh mới nhất</CardTitle>
              <CardDescription>Học viên đăng ký gần đây</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/reports">
                Xem tất cả
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {latestEnrollments.length === 0 && (
                <p className="text-sm text-gray-500">
                  Chưa có ghi danh nào.
                </p>
              )}
              {latestEnrollments.map(
                (enrollment: {
                  id: number;
                  enrolled_at: string;
                  user_id: {
                    id: string;
                    first_name: string | null;
                    last_name: string | null;
                    avatar: string | null;
                  };
                  course_id: { id: number; title: string };
                }) => {
                  const userName =
                    [
                      enrollment.user_id?.first_name,
                      enrollment.user_id?.last_name,
                    ]
                      .filter(Boolean)
                      .join(" ") || "N/A";

                  return (
                    <div
                      key={enrollment.id}
                      className="flex items-center gap-3"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={getAssetUrl(enrollment.user_id?.avatar)}
                          alt={userName}
                        />
                        <AvatarFallback className="text-xs">
                          {userName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 truncate">
                        <p className="truncate text-sm font-medium">
                          {userName}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          đã ghi danh{" "}
                          <span className="font-medium">
                            {enrollment.course_id?.title}
                          </span>
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-gray-500">
                        {formatDistanceToNow(
                          new Date(enrollment.enrolled_at),
                          {
                            addSuffix: true,
                            locale: vi,
                          }
                        )}
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          </CardContent>
        </Card>

        {/* Latest Reviews */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Đánh giá mới nhất</CardTitle>
              <CardDescription>Nhận xét từ học viên gần đây</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/reviews">
                Xem tất cả
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {latestReviews.length === 0 && (
                <p className="text-sm text-gray-500">
                  Chưa có đánh giá nào.
                </p>
              )}
              {latestReviews.map(
                (review: {
                  id: number;
                  rating: number;
                  comment: string | null;
                  date_created: string;
                  user_id: {
                    id: string;
                    first_name: string | null;
                    last_name: string | null;
                    avatar: string | null;
                  };
                  course_id: { id: number; title: string };
                }) => {
                  const reviewerName =
                    [
                      review.user_id?.first_name,
                      review.user_id?.last_name,
                    ]
                      .filter(Boolean)
                      .join(" ") || "N/A";

                  return (
                    <div key={review.id} className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={getAssetUrl(review.user_id?.avatar)}
                          alt={reviewerName}
                        />
                        <AvatarFallback className="text-xs">
                          {reviewerName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{reviewerName}</p>
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
                        </div>
                        <p className="text-xs text-gray-500">
                          {review.course_id?.title}
                        </p>
                        {review.comment && (
                          <p className="line-clamp-2 text-sm text-gray-500">
                            {review.comment}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-gray-500">
                        {formatDistanceToNow(new Date(review.date_created), {
                          addSuffix: true,
                          locale: vi,
                        })}
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
