"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, apiPost, apiDelete } from "@/lib/api-fetch";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, ShoppingCart, Trash2, BookOpen } from "lucide-react";
import type { Course } from "@/types";

interface WishlistItemData {
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

export default function WishlistPage() {
  const router = useRouter();
  const [items, setItems] = useState<WishlistItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addingToCartId, setAddingToCartId] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/wishlist")
      .then((r) => r.json())
      .then((d) => setItems(d.data ?? []))
      .catch(() => toast.error("Không thể tải danh sách yêu thích"))
      .finally(() => setIsLoading(false));
  }, []);

  const handleRemove = async (itemId: string) => {
    setRemovingId(itemId);
    try {
      const res = await apiDelete(`/api/wishlist/${itemId}`);
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      toast.success("Đã xoá khỏi danh sách yêu thích");
    } catch {
      toast.error("Không thể xoá");
    } finally {
      setRemovingId(null);
    }
  };

  const handleAddToCart = async (courseId: string, itemId: string) => {
    setAddingToCartId(itemId);
    try {
      const res = await apiPost("/api/cart", { course_id: courseId });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Không thể thêm vào giỏ hàng");
      }

      toast.success("Đã thêm vào giỏ hàng");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể thêm vào giỏ hàng"
      );
    } finally {
      setAddingToCartId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Heart className="size-6" />
          Danh sách yêu thích
        </h1>
        <p className="text-muted-foreground">
          {items.length} khoá học
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="size-12 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-semibold">
              Chưa có khoá học yêu thích
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Nhấn vào biểu tượng trái tim trên các khoá học để lưu lại
            </p>
            <Link href="/courses" className="mt-4">
              <Button>Khám phá khoá học</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const course = item.course_id as Course;
            if (!course || typeof course === "string") return null;

            return (
              <Card key={item.id} className="overflow-hidden py-0 gap-0">
                <div className="relative aspect-video w-full overflow-hidden">
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
                <CardContent className="p-4 space-y-3">
                  <Link
                    href={`/courses/${course.slug}`}
                    className="font-semibold hover:underline line-clamp-2 leading-snug block"
                  >
                    {course.title}
                  </Link>
                  <div className="flex items-baseline gap-2">
                    {course.discount_price !== null &&
                    course.discount_price < course.price ? (
                      <>
                        <span className="font-bold">
                          {formatPrice(course.discount_price)}
                        </span>
                        <span className="text-sm text-muted-foreground line-through">
                          {formatPrice(course.price)}
                        </span>
                      </>
                    ) : course.price === 0 ? (
                      <span className="font-bold text-green-600">
                        Miễn phí
                      </span>
                    ) : (
                      <span className="font-bold">
                        {formatPrice(course.price)}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() =>
                        handleAddToCart(course.id, item.id)
                      }
                      disabled={addingToCartId === item.id}
                    >
                      <ShoppingCart className="mr-1.5 size-3.5" />
                      Thêm vào giỏ
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemove(item.id)}
                      disabled={removingId === item.id}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
