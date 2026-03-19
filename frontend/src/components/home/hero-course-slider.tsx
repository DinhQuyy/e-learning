"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { Course } from "@/types";
import { KiwiCourseCard } from "./kiwi-course-card";

interface HeroCourseSliderProps {
  courses: Course[];
  className?: string;
}

export function HeroCourseSlider({ courses, className }: HeroCourseSliderProps) {
  const slides = courses.slice(0, 5);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (slides.length < 2 || isPaused) return;

    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 4500);

    return () => window.clearInterval(timer);
  }, [slides.length, isPaused]);

  useEffect(() => {
    if (activeIndex >= slides.length && slides.length > 0) {
      setActiveIndex(0);
    }
  }, [activeIndex, slides.length]);

  if (slides.length === 0) {
    return (
      <div className={cn("rounded-2xl border bg-card p-8 text-center", className)}>
        <p className="text-sm text-muted-foreground">Đang cập nhật khóa học nổi bật.</p>
      </div>
    );
  }

  if (slides.length === 1) {
    return (
      <div className={className}>
        <KiwiCourseCard course={slides[0]} variant="hero" priority />
      </div>
    );
  }

  return (
    <div
      className={cn("w-full space-y-4", className)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
    >
      <div className="overflow-hidden rounded-2xl">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          aria-live="polite"
        >
          {slides.map((course, index) => (
            <div key={course.id} className="w-full shrink-0">
              <KiwiCourseCard course={course} variant="hero" priority={index === 0} />
            </div>
          ))}
        </div>
      </div>

      <div
        className="flex items-center justify-center gap-2"
        role="tablist"
        aria-label="Chuyển slide khóa học"
      >
        {slides.map((course, index) => (
          <button
            key={course.id}
            type="button"
            role="tab"
            aria-selected={activeIndex === index}
            aria-label={`Xem slide ${index + 1}`}
            onClick={() => setActiveIndex(index)}
            className={cn(
              "h-2.5 rounded-full transition-all",
              activeIndex === index
                ? "w-8 bg-[var(--kiwi-primary)]"
                : "w-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
          />
        ))}
      </div>
    </div>
  );
}
