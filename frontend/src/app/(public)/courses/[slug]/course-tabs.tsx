"use client";

import { useEffect, useRef, useState } from "react";

interface TabItem {
  href: string;
  label: string;
}

const TAB_ITEMS: TabItem[] = [
  { href: "#overview", label: "Tổng quan" },
  { href: "#coursecontent", label: "Nội dung khoá học" },
  { href: "#details", label: "Chi tiết" },
  { href: "#instructor", label: "Giảng viên" },
  { href: "#review", label: "Đánh giá" },
];

const SECTION_IDS = TAB_ITEMS.map((t) => t.href.slice(1));

export function CourseTabs() {
  const [activeId, setActiveId] = useState<string>("overview");
  const isClickScrolling = useRef(false);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    // Track which sections are currently visible and their intersection ratio
    const visibleMap = new Map<string, number>();

    function updateActive() {
      if (isClickScrolling.current) return;
      if (visibleMap.size === 0) return;

      // Pick the section with the highest intersection ratio (most visible)
      let best = "";
      let bestRatio = -1;
      for (const [id, ratio] of visibleMap) {
        if (ratio > bestRatio) {
          bestRatio = ratio;
          best = id;
        }
      }
      if (best) setActiveId(best);
    }

    for (const id of SECTION_IDS) {
      const el = document.getElementById(id);
      if (!el) continue;

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              visibleMap.set(id, entry.intersectionRatio);
            } else {
              visibleMap.delete(id);
            }
          }
          updateActive();
        },
        {
          // rootMargin: top offset to account for sticky header (~80px) + tab bar (~56px)
          rootMargin: "-80px 0px -40% 0px",
          threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0],
        }
      );

      observer.observe(el);
      observers.push(observer);
    }

    return () => {
      for (const obs of observers) obs.disconnect();
    };
  }, []);

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;

    setActiveId(id);
    isClickScrolling.current = true;

    // Offset for sticky header (80px) + a little breathing room
    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top, behavior: "smooth" });

    // Re-enable IntersectionObserver after scroll settles
    setTimeout(() => {
      isClickScrolling.current = false;
    }, 800);
  }

  return (
    <nav className="sticky top-20 z-20 overflow-x-auto rounded-2xl border border-border bg-background/95 shadow-sm backdrop-blur">
      <ul className="flex min-w-max items-center gap-1 p-2 text-sm font-semibold text-muted-foreground">
        {TAB_ITEMS.map((item) => {
          const id = item.href.slice(1);
          const isActive = activeId === id;
          return (
            <li key={item.href}>
              <a
                href={item.href}
                onClick={(e) => handleClick(e, id)}
                className={
                  isActive
                    ? "inline-flex rounded-xl px-4 py-2.5 transition-colors bg-[#eef3ff] text-[#2f57ef]"
                    : "inline-flex rounded-xl px-4 py-2.5 transition-colors hover:bg-[#eef3ff] hover:text-[#2f57ef]"
                }
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
