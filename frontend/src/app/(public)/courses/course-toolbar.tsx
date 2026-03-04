"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Grid3X3, List } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CourseToolbarProps {
  currentSort: string;
  currentView: "grid" | "list";
  totalCourses: number;
  startIndex: number;
  endIndex: number;
}

const sortOptions = [
  { value: "newest", label: "Mới - cũ" },
  { value: "oldest", label: "Cũ - mới" },
  { value: "popular", label: "Phổ biến" },
  { value: "rating", label: "Đánh giá cao" },
  { value: "price_asc", label: "Giá tăng dần" },
  { value: "price_desc", label: "Giá giảm dần" },
];

export function CourseToolbar({
  currentSort,
  currentView,
  totalCourses,
  startIndex,
  endIndex,
}: CourseToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateSort = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "newest") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }
    params.delete("page");
    const query = params.toString();
    router.push(query ? `?${query}` : "?");
  };

  const updateView = (value: "grid" | "list") => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "grid") {
      params.delete("view");
    } else {
      params.set("view", value);
    }
    params.delete("page");
    const query = params.toString();
    router.push(query ? `?${query}` : "?");
  };

  const showStart = totalCourses === 0 ? 0 : startIndex;
  const showEnd = totalCourses === 0 ? 0 : endIndex;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_24px_45px_-35px_rgba(15,23,42,0.5)] backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <ul className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1">
            <li>
              <button
                type="button"
                onClick={() => updateView("grid")}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  currentView === "grid"
                    ? "bg-white text-[#2f57ef] shadow-sm"
                    : "text-slate-500 hover:bg-white/80 hover:text-slate-700"
                }`}
                title="Xem dạng lưới"
              >
                <Grid3X3 className="size-3.5" />
                Lưới
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => updateView("list")}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  currentView === "list"
                    ? "bg-white text-[#2f57ef] shadow-sm"
                    : "text-slate-500 hover:bg-white/80 hover:text-slate-700"
                }`}
                title="Xem dạng danh sách"
              >
                <List className="size-3.5" />
                Danh sách
              </button>
            </li>
          </ul>

          <p className="text-sm text-slate-600">
            Hiển thị <span className="font-semibold text-slate-900">{showStart}</span>-
            <span className="font-semibold text-slate-900">{showEnd}</span> trên{" "}
            <span className="font-semibold text-slate-900">{totalCourses}</span> khóa
            học
          </p>
        </div>

        <div className="flex w-full items-end gap-3 sm:w-auto">
          <span className="pb-0.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Sắp xếp theo
          </span>
          <Select value={currentSort || "newest"} onValueChange={updateSort}>
            <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-white text-sm sm:w-[190px]">
              <SelectValue placeholder="Chọn cách sắp xếp" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
