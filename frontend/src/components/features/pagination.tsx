"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  className?: string;
}

function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [1];

  if (current > 3) {
    pages.push("ellipsis");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push("ellipsis");
  }

  if (total > 1) {
    pages.push(total);
  }

  return pages;
}

export function Pagination({
  currentPage,
  totalPages,
  className,
}: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const navigate = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page === 1) {
      params.delete("page");
    } else {
      params.set("page", String(page));
    }
    const query = params.toString();
    router.push(query ? `?${query}` : "?");
  };

  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <nav
      aria-label="Phan trang"
      className={cn("flex items-center justify-center gap-1", className)}
    >
      <Button
        variant="outline"
        size="icon"
        disabled={currentPage <= 1}
        onClick={() => navigate(currentPage - 1)}
        aria-label="Trang truoc"
      >
        <ChevronLeft className="size-4" />
      </Button>

      {pages.map((page, index) =>
        page === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            className="flex size-9 items-center justify-center"
          >
            <MoreHorizontal className="size-4 text-muted-foreground" />
          </span>
        ) : (
          <Button
            key={page}
            variant={page === currentPage ? "default" : "outline"}
            size="icon"
            onClick={() => navigate(page)}
            aria-label={`Trang ${page}`}
            aria-current={page === currentPage ? "page" : undefined}
          >
            {page}
          </Button>
        )
      )}

      <Button
        variant="outline"
        size="icon"
        disabled={currentPage >= totalPages}
        onClick={() => navigate(currentPage + 1)}
        aria-label="Trang sau"
      >
        <ChevronRight className="size-4" />
      </Button>
    </nav>
  );
}
