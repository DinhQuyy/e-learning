"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Search, Star, X } from "lucide-react";
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

interface CategoryGroup {
  parent: CategoryWithCount;
  children: CategoryWithCount[];
  totalCount: number;
}

const parentCategoryOrder = [
  "lap-trinh",
  "thiet-ke",
  "ngoai-ngu",
  "phat-trien-ban-than",
  "phat-trien-ca-nhan",
  "kinh-doanh",
];

function getParentId(parent: unknown): string | null {
  if (!parent) return null;
  if (typeof parent === "string") return parent;
  if (typeof parent === "number") return String(parent);

  if (typeof parent === "object") {
    const id = (parent as { id?: string | number | null }).id;
    if (typeof id === "string") return id;
    if (typeof id === "number") return String(id);
  }

  return null;
}

function sortCategories(a: CategoryWithCount, b: CategoryWithCount) {
  const sortA = Number(a.sort ?? 0);
  const sortB = Number(b.sort ?? 0);
  if (sortA !== sortB) return sortA - sortB;
  return a.name.localeCompare(b.name, "vi");
}

function getParentOrderIndex(category: CategoryWithCount): number {
  const normalizedSlug = category.slug.toLowerCase();
  const index = parentCategoryOrder.findIndex(
    (slug) => normalizedSlug === slug || normalizedSlug.startsWith(`${slug}-`)
  );
  return index === -1 ? Number.POSITIVE_INFINITY : index;
}

function sortRootCategories(a: CategoryWithCount, b: CategoryWithCount) {
  const orderA = getParentOrderIndex(a);
  const orderB = getParentOrderIndex(b);
  if (orderA !== orderB) return orderA - orderB;
  return sortCategories(a, b);
}

function getCategoryTone(slug: string) {
  const normalized = slug.toLowerCase();

  if (normalized.includes("kinh-doanh")) {
    return {
      dot: "bg-emerald-500",
      badge: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      active: "border-emerald-300 bg-emerald-50 text-emerald-800",
      related: "border-emerald-200/70 bg-emerald-50/50 text-emerald-700",
      tree: "border-emerald-200/70",
    };
  }

  if (normalized.includes("lap-trinh")) {
    return {
      dot: "bg-sky-500",
      badge: "bg-sky-50 text-sky-700 ring-sky-100",
      active: "border-sky-300 bg-sky-50 text-sky-800",
      related: "border-sky-200/70 bg-sky-50/50 text-sky-700",
      tree: "border-sky-200/70",
    };
  }

  if (normalized.includes("ngoai-ngu")) {
    return {
      dot: "bg-violet-500",
      badge: "bg-violet-50 text-violet-700 ring-violet-100",
      active: "border-violet-300 bg-violet-50 text-violet-800",
      related: "border-violet-200/70 bg-violet-50/50 text-violet-700",
      tree: "border-violet-200/70",
    };
  }

  if (
    normalized.includes("phat-trien-ca-nhan") ||
    normalized.includes("phat-trien-ban-than")
  ) {
    return {
      dot: "bg-amber-500",
      badge: "bg-amber-50 text-amber-700 ring-amber-100",
      active: "border-amber-300 bg-amber-50 text-amber-800",
      related: "border-amber-200/70 bg-amber-50/50 text-amber-700",
      tree: "border-amber-200/70",
    };
  }

  if (normalized.includes("thiet-ke")) {
    return {
      dot: "bg-fuchsia-500",
      badge: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100",
      active: "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-800",
      related: "border-fuchsia-200/70 bg-fuchsia-50/50 text-fuchsia-700",
      tree: "border-fuchsia-200/70",
    };
  }

  return {
    dot: "bg-[#2f57ef]",
    badge: "bg-[#eef3ff] text-[#2f57ef] ring-[#dbe5ff]",
    active: "border-[#2f57ef]/35 bg-[#eef3ff] text-[#2f57ef]",
    related: "border-[#2f57ef]/20 bg-[#f5f8ff] text-[#3757cf]",
    tree: "border-[#dbe5ff]",
  };
}

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
  const [expandedParents, setExpandedParents] = useState<
    Record<string, boolean>
  >({});

  const categoryGroups = useMemo(() => {
    const roots: CategoryWithCount[] = [];
    const childrenByParent = new Map<string, CategoryWithCount[]>();
    const categoryById = new Map<string, CategoryWithCount>();

    for (const category of categories) {
      categoryById.set(category.id, category);

      const parentId = getParentId(category.parent_id);
      if (!parentId) {
        roots.push(category);
        continue;
      }

      const existing = childrenByParent.get(parentId) ?? [];
      existing.push(category);
      childrenByParent.set(parentId, existing);
    }

    const groups: CategoryGroup[] = roots.sort(sortRootCategories).map((parent) => {
      const children = (childrenByParent.get(parent.id) ?? []).sort(
        sortCategories
      );
      const childCount = children.reduce(
        (sum, child) => sum + Number(child.course_count ?? 0),
        0
      );

      return {
        parent,
        children,
        totalCount: Number(parent.course_count ?? 0) + childCount,
      };
    });

    // Handle orphan nodes (if parent category is unavailable)
    for (const [parentId, children] of childrenByParent.entries()) {
      if (categoryById.has(parentId)) continue;
      for (const child of children.sort(sortCategories)) {
        groups.push({
          parent: child,
          children: [],
          totalCount: Number(child.course_count ?? 0),
        });
      }
    }

    return groups;
  }, [categories]);

  const activeParentId = useMemo(() => {
    if (!currentCategory) return null;

    const selected = categories.find((category) => category.slug === currentCategory);
    if (!selected) return null;

    return getParentId(selected.parent_id) ?? selected.id;
  }, [categories, currentCategory]);

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

  useEffect(() => {
    if (!activeParentId) return;
    setExpandedParents((prev) =>
      prev[activeParentId] ? prev : { ...prev, [activeParentId]: true }
    );
  }, [activeParentId]);

  const handleSingleSelect = (key: string, nextValue: string, currentValue: string) => {
    updateParam(key, currentValue === nextValue ? "all" : nextValue, "all");
  };

  const toggleParent = (parentId: string) => {
    setExpandedParents((prev) => ({ ...prev, [parentId]: !prev[parentId] }));
  };

  const expandAllParents = () => {
    const next: Record<string, boolean> = {};
    for (const group of categoryGroups) {
      if (group.children.length > 0) {
        next[group.parent.id] = true;
      }
    }
    setExpandedParents(next);
  };

  const collapseAllParents = () => setExpandedParents({});

  const hasActiveFilters = Boolean(
    currentSearch ||
      currentCategory ||
      (currentLevel && currentLevel !== "all") ||
      (currentPrice && currentPrice !== "all") ||
      (currentRating && currentRating !== "all")
  );

  return (
    <aside className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_18px_38px_-35px_rgba(15,23,42,0.55)]">
        <h4 className="mb-4 text-base font-semibold text-foreground">Tìm kiếm</h4>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Tìm kiếm khóa học"
            className="h-11 rounded-xl border-border bg-card pl-10 pr-9 text-sm text-foreground placeholder:text-muted-foreground"
          />
          {searchValue ? (
            <button
              type="button"
              onClick={() => setSearchValue("")}
              className="absolute right-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-muted-foreground"
              aria-label="Xóa tìm kiếm"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_18px_38px_-35px_rgba(15,23,42,0.55)]">
        <div className="relative border-b border-border bg-linear-to-r from-[#eef3ff] to-[#f6efff] px-5 py-4 dark:from-[#2f57ef]/10 dark:to-[#b966e7]/10">
          <div className="pointer-events-none absolute -right-8 top-0 h-20 w-20 rounded-full bg-[#2f57ef]/10 blur-2xl" />
          <div className="pointer-events-none absolute -left-8 bottom-0 h-16 w-16 rounded-full bg-sky-300/20 blur-2xl" />
          <div className="relative">
            <div>
              <h4 className="text-base font-semibold text-foreground">
                Danh mục khóa học
              </h4>
              <p className="mt-1 text-xs text-muted-foreground">
                Chọn theo nhóm lĩnh vực hoặc chuyên mục chi tiết
              </p>
            </div>
          </div>
          <div className="relative mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={expandAllParents}
              className="rounded-full border border-[#2f57ef]/20 bg-card px-3 py-1 text-xs font-semibold text-[#2f57ef] transition-colors hover:bg-[#eef3ff] dark:hover:bg-[#2f57ef]/15"
            >
              Mở tất cả
            </button>
            <button
              type="button"
              onClick={collapseAllParents}
              className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent"
            >
              Thu gọn
            </button>
          </div>
        </div>

        <div className="p-4">
          <ul className="space-y-2.5">
            <li>
              <button
                type="button"
                onClick={() => updateParam("category", "all", "all")}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-sm font-medium transition-all",
                  !currentCategory
                    ? "border-[#2f57ef]/35 bg-[#eef3ff] text-[#2f57ef] shadow-[0_10px_24px_-20px_rgba(47,87,239,0.75)]"
                    : "border-border text-foreground hover:border-border/80 hover:bg-accent"
                )}
              >
                <span className="inline-flex items-center gap-2">
                  <span className="inline-flex size-2 rounded-full bg-[#2f57ef]" />
                  Tất cả danh mục
                </span>
              </button>
            </li>

            {categoryGroups.map((group) => {
              const parentActive = currentCategory === group.parent.slug;
              const hasActiveChild = group.children.some(
                (child) => child.slug === currentCategory
              );
              const isExpanded = Boolean(
                expandedParents[group.parent.id] ?? hasActiveChild
              );
              const tone = getCategoryTone(group.parent.slug);

              return (
                <li key={group.parent.id} className="rounded-xl border border-border bg-card p-1.5">
                  <div className="flex items-center gap-1.5">
                    {group.children.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => toggleParent(group.parent.id)}
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        aria-label={isExpanded ? "Thu gọn danh mục con" : "Mở rộng danh mục con"}
                      >
                        <ChevronRight
                          className={cn(
                            "size-4 transition-transform duration-200",
                            isExpanded && "rotate-90"
                          )}
                        />
                      </button>
                    ) : (
                      <span className="inline-flex size-8 shrink-0" aria-hidden />
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (group.children.length > 0) {
                          setExpandedParents((prev) => ({
                            ...prev,
                            [group.parent.id]: true,
                          }));
                        }
                        handleSingleSelect(
                          "category",
                          group.parent.slug,
                          currentCategory || "all"
                        );
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-all",
                        parentActive
                          ? tone.active
                          : hasActiveChild
                            ? tone.related
                            : "border-border text-foreground hover:border-border/80 hover:bg-accent"
                      )}
                    >
                      <span className="inline-flex min-w-0 items-center gap-2.5">
                        <span className={cn("inline-flex size-2.5 shrink-0 rounded-full", tone.dot)} />
                        <span className="line-clamp-1 font-semibold">{group.parent.name}</span>
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-semibold ring-1",
                          tone.badge
                        )}
                      >
                        {group.totalCount}
                      </span>
                    </button>
                  </div>

                  {group.children.length > 0 && isExpanded ? (
                    <ul className={cn("ml-9 mt-1.5 space-y-1.5 border-l pl-3", tone.tree)}>
                      {group.children.map((child) => {
                        const childActive = currentCategory === child.slug;
                        return (
                          <li key={child.id}>
                            <button
                              type="button"
                              onClick={() =>
                                handleSingleSelect(
                                  "category",
                                  child.slug,
                                  currentCategory || "all"
                                )
                              }
                              className={cn(
                                "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-all",
                                childActive
                                  ? tone.active
                                  : "border-border text-muted-foreground hover:border-border/80 hover:bg-accent"
                              )}
                            >
                              <span className="inline-flex min-w-0 items-center gap-2">
                                <span className="inline-flex size-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                                <span className="line-clamp-1">{child.name}</span>
                              </span>
                              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                                {child.course_count}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_18px_38px_-35px_rgba(15,23,42,0.55)]">
        <h4 className="mb-4 text-base font-semibold text-foreground">Đánh giá</h4>
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
                      : "border-border text-muted-foreground hover:border-border/80 hover:bg-accent"
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

      <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_18px_38px_-35px_rgba(15,23,42,0.55)]">
        <h4 className="mb-4 text-base font-semibold text-foreground">Hình thức</h4>
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
                      : "border-border text-muted-foreground hover:border-border/80 hover:bg-accent"
                  )}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_18px_38px_-35px_rgba(15,23,42,0.55)]">
        <h4 className="mb-4 text-base font-semibold text-foreground">Cấp độ</h4>
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
                      : "border-border text-muted-foreground hover:border-border/80 hover:bg-accent"
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
          className="h-11 w-full rounded-xl border-slate-300 bg-white text-sm font-semibold text-foreground hover:bg-slate-50"
        >
          Xóa bộ lọc
        </Button>
      ) : null}
    </aside>
  );
}
