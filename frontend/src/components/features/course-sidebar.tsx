"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckCircle, ChevronDown, FileText, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Course, Lesson, Module } from "@/types";

interface CourseSidebarProps {
  course: Course;
  currentLessonSlug: string;
  completedLessonIds: string[];
  totalLessons: number;
  completedCount: number;
}

function getLessonIcon(lessonType: string) {
  return lessonType === "video" ? PlayCircle : FileText;
}

function formatDuration(seconds: number): string {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs} giây`;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function CourseSidebar({
  course,
  currentLessonSlug,
  completedLessonIds,
}: CourseSidebarProps) {
  const pathname = usePathname();
  const modules = (course.modules || []) as Module[];
  const pathParts = pathname.split("/").filter(Boolean);
  const activeLessonSlug = pathParts[pathParts.length - 1] || currentLessonSlug;

  const [expandedModules, setExpandedModules] = useState<Set<string>>(() => {
    const set = new Set<string>();
    for (const mod of modules) {
      const lessons = (mod.lessons || []) as Lesson[];
      if (lessons.some((lesson) => lesson.slug === activeLessonSlug)) {
        set.add(mod.id);
        break;
      }
    }

    if (set.size === 0 && modules.length > 0) {
      set.add(modules[0].id);
    }

    return set;
  });

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="space-y-2 p-3">
          {modules.map((mod, modIdx) => {
            const lessons = (mod.lessons || []) as Lesson[];
            const isExpanded = expandedModules.has(mod.id);
            const moduleLessonsCompleted = lessons.filter((lesson) =>
              completedLessonIds.includes(lesson.id)
            ).length;
            const moduleCompleted =
              lessons.length > 0 && moduleLessonsCompleted === lessons.length;

            return (
              <div key={mod.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <button
                  onClick={() => toggleModule(mod.id)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-3 text-left transition-colors",
                    isExpanded ? "bg-[#f8faff]" : "hover:bg-slate-50"
                  )}
                >
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-slate-500 transition-transform",
                      !isExpanded && "-rotate-90"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {modIdx + 1}. {mod.title || `Chương ${modIdx + 1}`}
                    </p>
                    <p className="text-xs text-slate-500">
                      {moduleLessonsCompleted}/{lessons.length} bài học
                    </p>
                  </div>
                  {moduleCompleted ? (
                    <CheckCircle className="size-4 shrink-0 text-emerald-600" />
                  ) : null}
                </button>

                {isExpanded ? (
                  <div className="space-y-1 border-t border-slate-100 p-2">
                    {lessons.map((lesson) => {
                      const isActive = lesson.slug === activeLessonSlug;
                      const isLessonCompleted = completedLessonIds.includes(lesson.id);
                      const LessonIcon = getLessonIcon(lesson.type);

                      return (
                        <Link
                          key={lesson.id}
                          href={`/learn/${course.slug}/${lesson.slug}`}
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                            isActive
                              ? "bg-[#eef3ff] text-[#2f57ef]"
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          )}
                        >
                          {isLessonCompleted ? (
                            <CheckCircle className="size-4 shrink-0 text-emerald-600" />
                          ) : (
                            <LessonIcon className="size-4 shrink-0" />
                          )}
                          <span className="flex-1 wrap-break-word font-medium leading-snug">{lesson.title}</span>
                          {lesson.duration > 0 ? (
                            <span className="shrink-0 text-[11px] text-slate-500">
                              {formatDuration(lesson.duration)}
                            </span>
                          ) : null}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}