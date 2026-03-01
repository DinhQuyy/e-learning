"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchInput } from "@/components/features/search-input";
import type { CategoryWithCount } from "@/lib/queries/categories";

interface CourseFiltersProps {
  categories: CategoryWithCount[];
  currentCategory: string;
  currentLevel: string;
  currentSort: string;
}

const levels = [
  { value: "all", label: "Tất cả cấp độ" },
  { value: "beginner", label: "Cơ bản" },
  { value: "intermediate", label: "Trung cấp" },
  { value: "advanced", label: "Nâng cao" },
  { value: "all_levels", label: "Mọi cấp độ" },
];

const sortOptions = [
  { value: "newest", label: "Mới nhất" },
  { value: "popular", label: "Phổ biến" },
  { value: "rating", label: "Đánh giá cao" },
  { value: "price_asc", label: "Giá tăng" },
  { value: "price_desc", label: "Giá giảm" },
];

export function CourseFilters({
  categories,
  currentCategory,
  currentLevel,
  currentSort,
}: CourseFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all" && value !== "newest") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    const query = params.toString();
    router.push(query ? `?${query}` : "?");
  };

  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="w-full sm:max-w-sm">
        <SearchInput placeholder="Tìm kiếm khoá học..." />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={currentCategory || "all"}
          onValueChange={(val) => updateParam("category", val)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Danh mục" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả danh mục</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.slug}>
                {cat.name} ({cat.course_count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentLevel || "all"}
          onValueChange={(val) => updateParam("level", val)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Cấp độ" />
          </SelectTrigger>
          <SelectContent>
            {levels.map((lv) => (
              <SelectItem key={lv.value} value={lv.value}>
                {lv.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentSort || "newest"}
          onValueChange={(val) => updateParam("sort", val)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Sắp xếp" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
