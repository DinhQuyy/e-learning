import { DollarSign, TrendingDown, TrendingUp, ShoppingCart } from "lucide-react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireRole } from "@/lib/dal";
import { getInstructorRevenueDetails } from "@/lib/queries/instructor";

import { EarningsChart } from "./earnings-chart";

export const dynamic = "force-dynamic";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function InstructorEarningsPage() {
  const { token } = await requireRole(["instructor"]);
  const revenue = await getInstructorRevenueDetails(token);

  const stats = [
    {
      label: "Tổng doanh thu",
      value: formatCurrency(revenue.totalRevenue),
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Tháng này",
      value: formatCurrency(revenue.currentMonthRevenue),
      icon: revenue.revenueChange >= 0 ? TrendingUp : TrendingDown,
      color: revenue.revenueChange >= 0 ? "text-blue-600" : "text-red-600",
      bg: revenue.revenueChange >= 0 ? "bg-blue-50" : "bg-red-50",
      sub:
        revenue.revenueChange !== 0
          ? `${revenue.revenueChange >= 0 ? "+" : ""}${revenue.revenueChange.toFixed(1)}% so với tháng trước`
          : undefined,
    },
    {
      label: "Tháng trước",
      value: formatCurrency(revenue.lastMonthRevenue),
      icon: DollarSign,
      color: "text-slate-600",
      bg: "bg-slate-50",
    },
    {
      label: "Tổng đơn hàng",
      value: revenue.totalOrders.toLocaleString("vi-VN"),
      icon: ShoppingCart,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.35)]">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2f57ef]">
          Doanh thu
        </p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">
          Thống kê doanh thu
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Theo dõi doanh thu từ các khóa học của bạn.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex size-12 items-center justify-center rounded-xl ${stat.bg}`}>
                <stat.icon className={`size-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className="text-xl font-bold text-slate-900">{stat.value}</p>
                {stat.sub && (
                  <p
                    className={`text-xs ${revenue.revenueChange >= 0 ? "text-emerald-600" : "text-red-600"}`}
                  >
                    {stat.sub}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <EarningsChart data={revenue.monthlyChart} />

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="p-5">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">
            Doanh thu theo khóa học
          </h3>

          {revenue.coursesRevenue.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Chưa có doanh thu nào.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Khóa học</TableHead>
                    <TableHead className="text-right">Học viên</TableHead>
                    <TableHead className="text-right">Doanh thu</TableHead>
                    <TableHead className="text-right">Tỷ lệ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenue.coursesRevenue.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell>
                        <Link
                          href={`/instructor/courses/${course.id}`}
                          className="font-medium text-slate-900 hover:text-[#2f57ef] hover:underline"
                        >
                          {course.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right text-slate-600">
                        {course.enrollments.toLocaleString("vi-VN")}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-slate-900">
                        {formatCurrency(course.revenue)}
                      </TableCell>
                      <TableCell className="text-right text-slate-500">
                        {revenue.totalRevenue > 0
                          ? `${((course.revenue / revenue.totalRevenue) * 100).toFixed(1)}%`
                          : "0%"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
