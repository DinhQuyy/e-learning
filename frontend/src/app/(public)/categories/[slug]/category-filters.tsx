"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface CategoryFiltersProps {
  currentSort: string;
  currentLevel: string;
}

export function CategoryFilters({
  currentSort,
  currentLevel,
}: CategoryFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      const query = params.toString();
      router.push(query ? `?${query}` : "?");
    },
    [router, searchParams]
  );

  const clearFilters = useCallback(() => {
    router.push("?");
  }, [router]);

  const hasFilters = currentLevel || currentSort !== "newest";

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-3">
        <Select
          value={currentSort}
          onValueChange={(v) => updateParam("sort", v)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Sắp xếp" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Mới nhất</SelectItem>
            <SelectItem value="oldest">Cũ nhất</SelectItem>
            <SelectItem value="popular">Phổ biến nhất</SelectItem>
            <SelectItem value="rating">Đánh giá cao</SelectItem>
            <SelectItem value="price_asc">Giá thấp → cao</SelectItem>
            <SelectItem value="price_desc">Giá cao → thấp</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={currentLevel || "all"}
          onValueChange={(v) => updateParam("level", v)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Trình độ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trình độ</SelectItem>
            <SelectItem value="beginner">Người mới</SelectItem>
            <SelectItem value="intermediate">Trung cấp</SelectItem>
            <SelectItem value="advanced">Nâng cao</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="w-fit text-muted-foreground"
        >
          <X className="mr-1 size-4" />
          Xoá bộ lọc
        </Button>
      )}
    </div>
  );
}
