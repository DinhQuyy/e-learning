"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { CategoryWithCount } from "@/lib/queries/categories";

interface CourseFiltersProps {
  categories: CategoryWithCount[];
  currentSearch: string;
  currentCategory: string;
  currentLevel: string;
  currentPrice: string;
  currentRating: string;
}

const levels = [
  { value: "all", label: "Tất cả cấp độ" },
  { value: "beginner", label: "Cơ bản" },
  { value: "intermediate", label: "Trung cấp" },
  { value: "advanced", label: "Nâng cao" },
  { value: "all_levels", label: "Mọi cấp độ" },
];

const priceOptions = [
  { value: "all", label: "Tất cả" },
  { value: "free", label: "Miễn phí" },
  { value: "paid", label: "Trả phí" },
];

const ratingOptions = [
  { value: "5", label: "Từ 5 sao" },
  { value: "4", label: "Từ 4 sao" },
  { value: "3", label: "Từ 3 sao" },
  { value: "2", label: "Từ 2 sao" },
];

export function CourseFilters({
  categories,
  currentSearch,
  currentCategory,
  currentLevel,
  currentPrice,
  currentRating,
}: CourseFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(currentSearch);
  const [showAllCategories, setShowAllCategories] = useState(false);

  const visibleCategories = useMemo(
    () => (showAllCategories ? categories : categories.slice(0, 6)),
    [categories, showAllCategories]
  );

  const updateParam = useCallback(
    (key: string, value: string, defaultValue = "all") => {
      const params = new URLSearchParams(searchParams.toString());
      if (!value || value === defaultValue) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      params.delete("page");
      const query = params.toString();
      router.push(query ? `?${query}` : "?");
    },
    [router, searchParams]
  );

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("search");
    params.delete("category");
    params.delete("level");
    params.delete("price");
    params.delete("rating");
    params.delete("page");
    const query = params.toString();
    router.push(query ? `?${query}` : "?");
  };

  useEffect(() => {
    setSearchValue(currentSearch);
  }, [currentSearch]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const normalized = searchValue.trim();
      if (normalized === currentSearch.trim()) return;
      updateParam("search", normalized, "");
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [searchValue, currentSearch, updateParam]);

  const handleSingleSelect = (key: string, nextValue: string, currentValue: string) => {
    updateParam(key, currentValue === nextValue ? "all" : nextValue, "all");
  };

  const hasActiveFilters = Boolean(
    currentSearch ||
      currentCategory ||
      (currentLevel && currentLevel !== "all") ||
      (currentPrice && currentPrice !== "all") ||
      (currentRating && currentRating !== "all")
  );

  return (
    <aside className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_38px_-35px_rgba(15,23,42,0.55)]">
        <h4 className="mb-4 text-base font-semibold text-slate-900">Tìm kiếm</h4>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Tìm kiếm khóa học"
            className="h-11 rounded-xl border-slate-200 bg-white pl-10 pr-9 text-sm text-slate-700 placeholder:text-slate-400"
          />
          {searchValue ? (
            <button
              type="button"
              onClick={() => setSearchValue("")}
              className="absolute right-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              aria-label="Xóa tìm kiếm"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_38px_-35px_rgba(15,23,42,0.55)]">
        <h4 className="mb-4 text-base font-semibold text-slate-900">
          Danh mục khóa học
        </h4>
        <ul className="space-y-2">
          <li>
            <button
              type="button"
              onClick={() => updateParam("category", "all", "all")}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                !currentCategory
                  ? "border-[#2f57ef]/35 bg-[#eef3ff] text-[#2f57ef]"
                  : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <span>Tất cả danh mục</span>
            </button>
          </li>
          {visibleCategories.map((category) => (
            <li key={category.id}>
              <button
                type="button"
                onClick={() =>
                  handleSingleSelect("category", category.slug, currentCategory || "all")
                }
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                  currentCategory === category.slug
                    ? "border-[#2f57ef]/35 bg-[#eef3ff] text-[#2f57ef]"
                    : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                <span className="line-clamp-1">{category.name}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                  {category.course_count}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {categories.length > 6 ? (
          <button
            type="button"
            onClick={() => setShowAllCategories((prev) => !prev)}
            className="mt-3 text-sm font-semibold text-[#2f57ef] hover:underline"
          >
            {showAllCategories ? "Thu gọn" : "Xem thêm"}
          </button>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_38px_-35px_rgba(15,23,42,0.55)]">
        <h4 className="mb-4 text-base font-semibold text-slate-900">Đánh giá</h4>
        <ul className="space-y-2">
          {ratingOptions.map((option) => {
            const active = (currentRating || "all") === option.value;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  onClick={() =>
                    handleSingleSelect("rating", option.value, currentRating || "all")
                  }
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                    active
                      ? "border-[#2f57ef]/35 bg-[#eef3ff] text-[#2f57ef]"
                      : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Star className="size-4 fill-amber-400 text-amber-400" />
                    {option.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_38px_-35px_rgba(15,23,42,0.55)]">
        <h4 className="mb-4 text-base font-semibold text-slate-900">Hình thức</h4>
        <ul className="space-y-2">
          {priceOptions.map((option) => {
            const active = (currentPrice || "all") === option.value;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  onClick={() =>
                    handleSingleSelect("price", option.value, currentPrice || "all")
                  }
                  className={cn(
                    "flex w-full items-center rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                    active
                      ? "border-[#2f57ef]/35 bg-[#eef3ff] text-[#2f57ef]"
                      : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_38px_-35px_rgba(15,23,42,0.55)]">
        <h4 className="mb-4 text-base font-semibold text-slate-900">Cấp độ</h4>
        <ul className="space-y-2">
          {levels.map((level) => {
            const active = (currentLevel || "all") === level.value;
            return (
              <li key={level.value}>
                <button
                  type="button"
                  onClick={() =>
                    handleSingleSelect("level", level.value, currentLevel || "all")
                  }
                  className={cn(
                    "flex w-full items-center rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                    active
                      ? "border-[#2f57ef]/35 bg-[#eef3ff] text-[#2f57ef]"
                      : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  {level.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {hasActiveFilters ? (
        <Button
          type="button"
          variant="outline"
          onClick={clearFilters}
          className="h-11 w-full rounded-xl border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Xóa bộ lọc
        </Button>
      ) : null}
    </aside>
  );
}
