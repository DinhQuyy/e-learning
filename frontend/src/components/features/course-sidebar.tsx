"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  PlayCircle,
  FileText,
  ChevronDown,
} from "lucide-react";
import type { Course, Module, Lesson } from "@/types";
import { useState } from "react";

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
  if (mins === 0) return `${secs}s`;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function CourseSidebar({
  course,
  currentLessonSlug: _currentLessonSlug,
  completedLessonIds,
  totalLessons,
  completedCount,
}: CourseSidebarProps) {
  const pathname = usePathname();
  const modules = (course.modules || []) as Module[];

  // Determine the active lesson from pathname
  const pathParts = pathname.split("/");
  const activeLessonSlug = pathParts[pathParts.length - 1] || "";

  // Track which modules are expanded
  const [expandedModules, setExpandedModules] = useState<Set<string>>(() => {
    // Expand the module that contains the current lesson
    const set = new Set<string>();
    for (const mod of modules) {
      const lessons = (mod.lessons || []) as Lesson[];
      if (lessons.some((l) => l.slug === activeLessonSlug)) {
        set.add(mod.id);
        break;
      }
    }
    // If none found, expand the first module
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

  const progressPercent =
    totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <div className="flex h-full flex-col">
      {/* Progress Header */}
      <div className="border-b p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Tiến độ khoá học</span>
          <span className="font-medium">{progressPercent}%</span>
        </div>
        <Progress value={progressPercent} />
        <p className="text-xs text-muted-foreground">
          {completedCount}/{totalLessons} bài học hoàn thành
        </p>
      </div>

      {/* Module List */}
      <ScrollArea className="flex-1">
        <div className="py-2">
          {modules.map((mod, modIdx) => {
            const lessons = (mod.lessons || []) as Lesson[];
            const isExpanded = expandedModules.has(mod.id);
            const moduleCompleted = lessons.every((l) =>
              completedLessonIds.includes(l.id)
            );
            const moduleLessonsCompleted = lessons.filter((l) =>
              completedLessonIds.includes(l.id)
            ).length;

            return (
              <div key={mod.id}>
                {/* Module Header */}
                <button
                  onClick={() => toggleModule(mod.id)}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                >
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground transition-transform",
                      !isExpanded && "-rotate-90"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {modIdx + 1}. {mod.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {moduleLessonsCompleted}/{lessons.length} bài học
                    </p>
                  </div>
                  {moduleCompleted && lessons.length > 0 && (
                    <CheckCircle className="size-4 text-green-600 shrink-0" />
                  )}
                </button>

                {/* Lessons */}
                {isExpanded && (
                  <div className="pb-2">
                    {lessons.map((lesson) => {
                      const isActive = lesson.slug === activeLessonSlug;
                      const isLessonCompleted = completedLessonIds.includes(
                        lesson.id
                      );
                      const LessonIcon = getLessonIcon(lesson.type);

                      return (
                        <Link
                          key={lesson.id}
                          href={`/learn/${course.slug}/${lesson.slug}`}
                          className={cn(
                            "flex items-center gap-3 px-4 py-2 pl-10 text-sm transition-colors",
                            isActive
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          )}
                        >
                          {isLessonCompleted ? (
                            <CheckCircle className="size-4 text-green-600 shrink-0" />
                          ) : (
                            <LessonIcon className="size-4 shrink-0" />
                          )}
                          <span className="flex-1 truncate">{lesson.title}</span>
                          {lesson.duration > 0 && (
                            <span className="text-xs text-muted-foreground shrink-0">
                              {formatDuration(lesson.duration)}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
