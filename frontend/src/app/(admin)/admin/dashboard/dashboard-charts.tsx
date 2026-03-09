"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const priceFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("vi-VN");

interface RevenueChartProps {
  data: { month: string; revenue: number }[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Doanh thu 6 tháng gần nhất</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-75">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis
                className="text-xs"
                tickFormatter={(v) =>
                  v >= 1_000_000
                    ? `${(v / 1_000_000).toFixed(0)}M`
                    : v >= 1_000
                      ? `${(v / 1_000).toFixed(0)}K`
                      : String(v)
                }
              />
              <Tooltip
                formatter={(value) => [
                  priceFormatter.format(value as number),
                  "Doanh thu",
                ]}
                labelFormatter={(label) => `Tháng ${label}`}
              />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

interface EnrollmentChartProps {
  data: { month: string; enrollments: number }[];
}

export function EnrollmentChart({ data }: EnrollmentChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ghi danh 6 tháng gần nhất</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-75">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                formatter={(value) => [
                  numberFormatter.format(value as number),
                  "Ghi danh",
                ]}
                labelFormatter={(label) => `Tháng ${label}`}
              />
              <Line
                type="monotone"
                dataKey="enrollments"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

interface CourseStatusChartProps {
  data: { name: string; value: number; fill: string }[];
}

export function CourseStatusChart({ data }: CourseStatusChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Phân bố trạng thái khoá học</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-75">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
                label={({ name, value }) =>
                  `${name}: ${value}`
                }
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [
                  `${numberFormatter.format(value as number)} (${total > 0 ? (((value as number) / total) * 100).toFixed(1) : 0}%)`,
                  name as string,
                ]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
