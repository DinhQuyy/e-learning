"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { apiFetch } from "@/lib/api-fetch";
import { getCourseImageSrc } from "@/lib/course-image";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, CheckCircle2, GraduationCap, PlayCircle } from "lucide-react";
import type { Course, Order, OrderItem } from "@/types";

export default function CheckoutSuccessPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/api/orders/${orderId}`)
      .then((r) => r.json())
      .then((d) => setOrder(d.data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [orderId]);

  const courses = (order?.items ?? [])
    .map((item: OrderItem) => item.course_id as Course)
    .filter((c): c is Course => !!c && typeof c !== "string");

  const firstCourse = courses[0];

  return (
    <div className="min-h-screen bg-[#f6f9ff] pb-16 pt-12">
      <div className="mx-auto max-w-xl px-4 sm:px-6">
        {/* Success badge */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="size-10 text-emerald-600" />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-slate-900">
            Thanh toán thành công!
          </h1>
          <p className="mt-2 text-slate-500">
            Đơn hàng đã được xử lý. Bạn có thể bắt đầu học ngay bây giờ.
          </p>
          {order?.order_number && (
            <span className="mt-3 inline-block rounded-full bg-slate-100 px-3 py-1 font-mono text-xs text-slate-500">
              {order.order_number}
            </span>
          )}
        </div>

        {/* Course list */}
        {isLoading ? (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-14 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : courses.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-700">
                <GraduationCap className="mr-1.5 inline-block size-4 text-[#2f57ef]" />
                Khoá học của bạn ({courses.length})
              </h2>
            </div>
            <div className="divide-y divide-slate-100">
              {courses.map((course) => (
                <Link
                  key={course.id}
                  href={`/learn/${course.slug}`}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[#f8faff]"
                >
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-xl">
                    <Image
                      src={getCourseImageSrc(course)}
                      alt={course.title}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800 group-hover:text-[#2f57ef]">
                      {course.title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">Bắt đầu học ngay</p>
                  </div>
                  <PlayCircle className="size-5 shrink-0 text-slate-300 group-hover:text-[#2f57ef]" />
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {/* Actions */}
        <div className="mt-6 space-y-3">
          {firstCourse && (
            <Button
              asChild
              className="h-12 w-full rounded-xl text-sm font-semibold text-white"
              style={{ background: "linear-gradient(90deg, #2f57ef, #b966e7)", border: 0 }}
            >
              <Link href={`/learn/${firstCourse.slug}`}>
                <PlayCircle className="mr-2 size-4" />
                Bắt đầu học ngay
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" className="h-11 w-full rounded-xl text-sm">
            <Link href="/my-courses">
              Xem tất cả khoá học của tôi
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
          <div className="text-center">
            <Link href="/courses" className="text-sm text-slate-400 hover:text-slate-600 hover:underline">
              Tiếp tục khám phá khoá học
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
