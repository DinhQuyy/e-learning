"use client";

import { Pagination } from "@/components/features/pagination";

interface CategoryPaginationProps {
  currentPage: number;
  totalPages: number;
}

export function CategoryPagination({
  currentPage,
  totalPages,
}: CategoryPaginationProps) {
  return (
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      className="mt-10"
    />
  );
}
