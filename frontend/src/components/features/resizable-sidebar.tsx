"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const MIN_WIDTH = 240;
const MAX_WIDTH = 520;
const DEFAULT_WIDTH = 320;
const STORAGE_KEY = "course-sidebar-width";
const COLLAPSED_STORAGE_KEY = "course-sidebar-collapsed";

interface ResizableSidebarProps {
  children: React.ReactNode;
  header: React.ReactNode;
}

export function ResizableSidebar({ children, header }: ResizableSidebarProps) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(DEFAULT_WIDTH);

  // Restore saved state on mount
  useEffect(() => {
    const savedWidth = localStorage.getItem(STORAGE_KEY);
    if (savedWidth) {
      const parsed = parseInt(savedWidth, 10);
      if (!isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
        setWidth(parsed);
      }
    }
    const savedCollapsed = localStorage.getItem(COLLAPSED_STORAGE_KEY);
    if (savedCollapsed === "true") setCollapsed(true);
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next));
  };

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (collapsed) return;
    e.preventDefault();
    startXRef.current = e.clientX;
    startWidthRef.current = sidebarRef.current?.offsetWidth ?? DEFAULT_WIDTH;
    setIsDragging(true);
  }, [collapsed]);

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startXRef.current;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidthRef.current + delta));
      setWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsDragging(false);
      const currentWidth = sidebarRef.current?.offsetWidth;
      if (currentWidth) localStorage.setItem(STORAGE_KEY, String(currentWidth));
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging]);

  return (
    <>
      {/* Drag overlay to prevent iframe/video stealing mouse events */}
      {isDragging && (
        <div className="fixed inset-0 z-50 cursor-col-resize select-none" />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        style={{ width: collapsed ? 0 : width }}
        className="hidden lg:flex lg:shrink-0 lg:flex-col lg:overflow-hidden lg:border-r lg:border-slate-200/80 lg:bg-white lg:shadow-[2px_0_12px_-4px_rgba(15,23,42,0.08)] lg:transition-[width] lg:duration-200"
      >
        {/* Header */}
        <div className="shrink-0 overflow-hidden">
          {header}
        </div>

        {/* Scrollable content — custom thin scrollbar */}
        <div
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "rgb(203 213 225) transparent",
          }}
        >
          {children}
        </div>
      </aside>

      {/* Drag + collapse handle */}
      <div className="relative hidden lg:block lg:w-0">
        {/* Drag strip — only when expanded */}
        {!collapsed && (
          <div
            onMouseDown={onMouseDown}
            className={cn(
              "absolute inset-y-0 -left-1 w-3 cursor-col-resize",
              isDragging ? "bg-[#2f57ef]/20" : "bg-transparent hover:bg-[#2f57ef]/10"
            )}
          />
        )}

        {/* Collapse / expand toggle button — always visible at left edge */}
        <button
          onClick={toggleCollapse}
          title={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
          className="absolute top-1/2 -translate-y-1/2 z-20 flex h-10 w-5 items-center justify-center rounded-r-lg border border-l-0 border-slate-200 bg-white text-slate-400 shadow-md transition-all hover:border-[#2f57ef]/30 hover:text-[#2f57ef] hover:shadow-lg"
          style={{ left: 0 }}
        >
          {collapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </button>
      </div>
    </>
  );
}
