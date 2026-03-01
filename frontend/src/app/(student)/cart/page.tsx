"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, apiDelete } from "@/lib/api-fetch";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, Trash2, ArrowRight, BookOpen } from "lucide-react";
import type { Course } from "@/types";

interface CartItemData {
  id: string;
  course_id: Course;
  date_created: string;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
}

function getCoursePrice(course: Course): number {
  if (course.discount_price !== null && course.discount_price < course.price) {
    return course.discount_price;
  }
  return course.price;
}

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/cart")
      .then((r) => r.json())
      .then((d) => setItems(d.data ?? []))
      .catch(() => toast.error("Không thể tải giỏ hàng"))
      .finally(() => setIsLoading(false));
  }, []);

  const handleRemove = async (itemId: string) => {
    setRemovingId(itemId);
    try {
      const res = await apiDelete(`/api/cart/${itemId}`);
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      toast.success("Đã xoá khỏi giỏ hàng");
    } catch {
      toast.error("Không thể xoá");
    } finally {
      setRemovingId(null);
    }
  };

  const totalPrice = items.reduce((sum, item) => {
    const course = item.course_id;
    if (!course || typeof course === "string") return sum;
    return sum + getCoursePrice(course);
  }, 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ShoppingCart className="size-6" />
          Giỏ hàng
        </h1>
        <p className="text-muted-foreground">
          {items.length} khoá học trong giỏ hàng
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="size-12 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-semibold">Giỏ hàng trống</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Khám phá các khoá học và thêm vào giỏ hàng
            </p>
            <Link href="/courses" className="mt-4">
              <Button>Khám phá khoá học</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const course = item.course_id as Course;
              if (!course || typeof course === "string") return null;
              const price = getCoursePrice(course);

              return (
                <Card key={item.id}>
                  <CardContent className="flex gap-4 p-4">
                    <div className="relative size-20 shrink-0 rounded-lg overflow-hidden">
                      <Image
                        src={
                          course.thumbnail
                            ? `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/assets/${course.thumbnail}`
                            : "/placeholder.svg"
                        }
                        alt={course.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/courses/${course.slug}`}
                        className="font-semibold hover:underline line-clamp-1"
                      >
                        {course.title}
                      </Link>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="font-bold">
                          {price === 0 ? "Miễn phí" : formatPrice(price)}
                        </span>
                        {course.discount_price !== null &&
                          course.discount_price < course.price && (
                            <span className="text-sm text-muted-foreground line-through">
                              {formatPrice(course.price)}
                            </span>
                          )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive"
                      onClick={() => handleRemove(item.id)}
                      disabled={removingId === item.id}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div>
            <Card className="sticky top-20">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold text-lg">Tổng cộng</h3>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {items.length} khoá học
                  </span>
                  <span className="text-2xl font-bold">
                    {totalPrice === 0 ? "Miễn phí" : formatPrice(totalPrice)}
                  </span>
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => router.push("/checkout")}
                >
                  Thanh toán
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
