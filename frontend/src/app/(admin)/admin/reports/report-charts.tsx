"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrendingUp, BarChart3 } from "lucide-react";

const numberFormatter = new Intl.NumberFormat("vi-VN");

interface EnrollmentTrendChartProps {
  data: { month: string; count: number }[];
}

export function EnrollmentTrendChart({ data }: EnrollmentTrendChartProps) {
  return (
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
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" allowDecimals={false} />
              <Tooltip
                formatter={(value) => [
                  numberFormatter.format(value as number),
                  "Ghi danh",
                ]}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ r: 5, fill: "#8b5cf6" }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

interface RatingDistributionChartProps {
  data: { rating: number; count: number; percentage: number }[];
  totalReviews: number;
}

export function RatingDistributionChart({
  data,
  totalReviews,
}: RatingDistributionChartProps) {
  const chartData = data
    .map((d) => ({
      name: `${d.rating} sao`,
      count: d.count,
      percentage: d.percentage,
    }))
    .reverse(); // 1->5 for chart display

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Phân bố đánh giá
        </CardTitle>
        <CardDescription>
          Tổng quan đánh giá toàn nền tảng (
          {numberFormatter.format(totalReviews)} đánh giá đã duyệt)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" className="text-xs" allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                className="text-xs"
                width={50}
              />
              <Tooltip
                formatter={(value, _name, props) => [
                  `${numberFormatter.format(value as number)} (${props.payload.percentage.toFixed(1)}%)`,
                  "Đánh giá",
                ]}
              />
              <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
