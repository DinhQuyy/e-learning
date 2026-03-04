"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface CoursePaginationProps {
  currentPage: number;
  totalPages: number;
}

function getPages(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages: (number | "ellipsis")[] = [1];

  if (current > 3) {
    pages.push("ellipsis");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (current < total - 2) {
    pages.push("ellipsis");
  }

  pages.push(total);
  return pages;
}

export function CoursePagination({ currentPage, totalPages }: CoursePaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const navigateTo = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(nextPage));
    }
    const query = params.toString();
    router.push(query ? `?${query}` : "?");
  };

  const pages = getPages(currentPage, totalPages);

  return (
    <nav aria-label="Phân trang khóa học" className="mt-10 flex justify-center">
      <ul className="flex items-center gap-2">
        <li>
          <button
            type="button"
            onClick={() => navigateTo(currentPage - 1)}
            disabled={currentPage <= 1}
            className={cn(
              "inline-flex size-10 items-center justify-center rounded-full border text-slate-600 transition-colors",
              currentPage <= 1
                ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                : "border-slate-200 bg-white hover:border-[#2f57ef]/40 hover:text-[#2f57ef]"
            )}
            aria-label="Trang trước"
          >
            <ChevronLeft className="size-4" />
          </button>
        </li>

        {pages.map((page, index) =>
          page === "ellipsis" ? (
            <li
              key={`ellipsis-${index}`}
              className="inline-flex size-10 items-center justify-center text-slate-400"
            >
              <MoreHorizontal className="size-4" />
            </li>
          ) : (
            <li key={page}>
              <button
                type="button"
                onClick={() => navigateTo(page)}
                aria-label={`Trang ${page}`}
                aria-current={page === currentPage ? "page" : undefined}
                className={cn(
                  "inline-flex size-10 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                  page === currentPage
                    ? "border-[#2f57ef] bg-[#2f57ef] text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-[#2f57ef]/40 hover:text-[#2f57ef]"
                )}
              >
                {page}
              </button>
            </li>
          )
        )}

        <li>
          <button
            type="button"
            onClick={() => navigateTo(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className={cn(
              "inline-flex size-10 items-center justify-center rounded-full border text-slate-600 transition-colors",
              currentPage >= totalPages
                ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                : "border-slate-200 bg-white hover:border-[#2f57ef]/40 hover:text-[#2f57ef]"
            )}
            aria-label="Trang sau"
          >
            <ChevronRight className="size-4" />
          </button>
        </li>
      </ul>
    </nav>
  );
}
