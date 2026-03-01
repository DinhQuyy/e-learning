import { requireAuth } from "@/lib/dal";
import { getAssetUrl } from "@/lib/directus";
import {
  getAdminStats,
  getLatestEnrollments,
  getLatestReviews,
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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Dashboard - Quản trị hệ thống",
};

const numberFormatter = new Intl.NumberFormat("vi-VN");

export default async function AdminDashboardPage() {
  const { token } = await requireAuth();

  const [stats, latestEnrollments, latestReviews] = await Promise.all([
    getAdminStats(token),
    getLatestEnrollments(token, 5),
    getLatestReviews(token, 5),
  ]);

  const statCards = [
    {
      label: "Tổng người dùng",
      value: stats.totalUsers,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
      href: "/admin/users",
    },
    {
      label: "Tổng khoá học",
      value: stats.totalCourses,
      icon: BookOpen,
      color: "text-green-600",
      bg: "bg-green-50",
      href: "/admin/courses",
    },
    {
      label: "Tổng ghi danh",
      value: stats.totalEnrollments,
      icon: GraduationCap,
      color: "text-purple-600",
      bg: "bg-purple-50",
      href: "/admin/reports",
    },
    {
      label: "Khoá học chờ duyệt",
      value: stats.pendingCourses,
      icon: Clock,
      color: "text-orange-600",
      bg: "bg-orange-50",
      href: "/admin/courses?status=pending",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Tổng quan hệ thống
        </h1>
        <p className="text-muted-foreground">
          Theo dõi và quản lý nền tảng học trực tuyến của bạn.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {stat.label}
                      </p>
                      <p className="mt-1 text-3xl font-bold">
                        {numberFormatter.format(stat.value)}
                      </p>
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
            <Button asChild variant="outline">
              <Link href="/admin/users">
                <UserPlus className="mr-2 h-4 w-4" />
                Quản lý người dùng
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/courses?status=pending">
                <CheckCircle className="mr-2 h-4 w-4" />
                Duyệt khoá học
                {stats.pendingCourses > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {stats.pendingCourses}
                  </Badge>
                )}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/reviews">
                <Star className="mr-2 h-4 w-4" />
                Kiểm duyệt đánh giá
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/categories">
                <BookOpen className="mr-2 h-4 w-4" />
                Quản lý danh mục
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Latest Enrollments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Ghi danh mới nhất</CardTitle>
              <CardDescription>
                Học viên đăng ký gần đây
              </CardDescription>
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
                <p className="text-sm text-muted-foreground">
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
                  const userName = [
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
                        <p className="truncate text-xs text-muted-foreground">
                          đã ghi danh{" "}
                          <span className="font-medium">
                            {enrollment.course_id?.title}
                          </span>
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(enrollment.enrolled_at), {
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

        {/* Latest Reviews */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Đánh giá mới nhất</CardTitle>
              <CardDescription>
                Nhận xét từ học viên gần đây
              </CardDescription>
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
                <p className="text-sm text-muted-foreground">
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
                  const reviewerName = [
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
                        <p className="text-xs text-muted-foreground">
                          {review.course_id?.title}
                        </p>
                        {review.comment && (
                          <p className="line-clamp-2 text-sm text-muted-foreground">
                            {review.comment}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
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
