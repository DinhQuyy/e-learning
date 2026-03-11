"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Search, TrendingUp, Users } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
import { getCourseImageSrc } from "@/lib/course-image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SearchSuggestion {
  id: string;
  title: string;
  slug: string;
  thumbnail: string | null;
  total_lessons: number;
  total_enrollments: number;
  average_rating: number;
}

interface SearchDialogCategory {
  id: string;
  name: string;
  slug: string;
}

interface HeaderSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories?: SearchDialogCategory[];
}

function formatRating(value: number): string {
  const safe = Number(value);
  if (!Number.isFinite(safe) || safe <= 0) return "0.0";
  return safe.toFixed(1);
}

export function HeaderSearchDialog({
  open,
  onOpenChange,
  categories = [],
}: HeaderSearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        params.set("limit", "6");

        const res = await apiFetch(`/api/search/courses?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          setSuggestions([]);
          return;
        }

        const json = (await res.json()) as { data?: SearchSuggestion[] };
        setSuggestions(Array.isArray(json.data) ? json.data : []);
      } catch (error) {
        if ((error as { name?: string }).name !== "AbortError") {
          setSuggestions([]);
        }
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, query]);

  const popularKeywords = useMemo(
    () => ["React", "Next.js", "JavaScript", "Data Analysis", "UI/UX", "Python"],
    []
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const searchValue = query.trim();
    onOpenChange(false);
    router.push(searchValue ? `/courses?search=${encodeURIComponent(searchValue)}` : "/courses");
  };

  const hasResults = suggestions.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[88vh] max-w-4xl overflow-hidden border-border/70 p-0"
        showCloseButton={false}
      >
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle className="text-lg font-semibold">Tìm kiếm khóa học</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Nhập từ khóa để xem gợi ý nhanh, tương tự popup tìm kiếm của Learnify.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[calc(88vh-92px)] grid-cols-1 overflow-hidden md:grid-cols-[1.35fr_0.65fr]">
          <div className="flex flex-col overflow-hidden border-b md:border-b-0 md:border-r">
            <form onSubmit={handleSubmit} className="border-b p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Tìm theo tên khóa học, kỹ năng..."
                  className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-28 text-sm outline-none focus:border-[#2f57ef] focus:ring-2 focus:ring-[#2f57ef]/20"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="absolute right-1.5 top-1/2 h-8 -translate-y-1/2 rounded-lg border-0 text-white"
                  style={{
                    backgroundImage: "linear-gradient(90deg, #2f57ef, #b966e7)",
                  }}
                >
                  Tìm
                </Button>
              </div>
            </form>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {query.trim() ? "Kết quả gợi ý" : "Các khóa học hàng đầu"}
                </p>
                {query.trim() && (
                  <Link
                    href={`/courses?search=${encodeURIComponent(query.trim())}`}
                    onClick={() => onOpenChange(false)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#2f57ef] hover:underline"
                  >
                    Xem tất cả
                    <ArrowRight className="size-3.5" />
                  </Link>
                )}
              </div>

              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-20 animate-pulse rounded-xl bg-muted/60" />
                  ))}
                </div>
              ) : hasResults ? (
                <div className="space-y-2">
                  {suggestions.map((course) => (
                    <Link
                      key={course.id}
                      href={`/courses/${course.slug}`}
                      onClick={() => onOpenChange(false)}
                      className="flex gap-3 rounded-xl border border-transparent p-2.5 transition-colors hover:border-border hover:bg-accent/60"
                    >
                      <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                        <Image
                          src={getCourseImageSrc(course)}
                          alt={course.title}
                          fill
                          className="object-cover"
                          sizes="96px"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-semibold text-foreground">
                          {course.title}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <BookOpen className="size-3.5" />
                            {course.total_lessons || 0} bài học
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Users className="size-3.5" />
                            {course.total_enrollments || 0}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <TrendingUp className="size-3.5" />
                            {formatRating(course.average_rating)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed p-6 text-center">
                  <p className="text-sm font-medium">Không tìm thấy kết quả phù hợp</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Thử đổi từ khóa hoặc tìm trong danh mục nhanh bên phải.
                  </p>
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-5 overflow-y-auto p-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Từ khóa phổ biến
              </p>
              <div className="flex flex-wrap gap-2">
                {popularKeywords.map((keyword) => (
                  <button
                    key={keyword}
                    type="button"
                    onClick={() => setQuery(keyword)}
                    className="rounded-full border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-[#2f57ef]/50 hover:bg-[#2f57ef]/10"
                  >
                    {keyword}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Danh mục đề xuất
              </p>
              <div className="space-y-1">
                {categories.slice(0, 6).map((category) => (
                  <Link
                    key={category.id}
                    href={category.slug ? `/categories/${category.slug}` : "/categories"}
                    onClick={() => onOpenChange(false)}
                    className="block rounded-md px-2.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    {category.name}
                  </Link>
                ))}
                {categories.length === 0 && (
                  <p className="px-2.5 py-2 text-sm text-muted-foreground">
                    Chưa có danh mục gợi ý.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl border bg-accent/30 p-3.5">
              <p className="text-sm font-semibold">Bạn cần bộ lọc nâng cao?</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Truy cập trang khóa học để lọc theo mức độ, giá và xếp hạng.
              </p>
              <Link
                href="/courses"
                onClick={() => onOpenChange(false)}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#2f57ef] hover:underline"
              >
                Mở trang khóa học
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
