"use client";

import { Pagination } from "@/components/features/pagination";

interface CoursePaginationProps {
  currentPage: number;
  totalPages: number;
}

export function CoursePagination({ currentPage, totalPages }: CoursePaginationProps) {
  return <Pagination currentPage={currentPage} totalPages={totalPages} className="mt-10" />;
}
