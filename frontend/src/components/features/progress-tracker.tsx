"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiPatch } from "@/lib/api-fetch";
import { CheckCircle, Circle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ProgressTrackerProps {
  enrollmentId: string;
  lessonId: string;
  isCompleted: boolean;
  videoPosition: number;
}

export function ProgressTracker({
  enrollmentId,
  lessonId,
  isCompleted: initialCompleted,
  videoPosition: initialVideoPosition,
}: ProgressTrackerProps) {
  const router = useRouter();
  const [isCompleted, setIsCompleted] = useState(initialCompleted);
  const [isLoading, setIsLoading] = useState(false);
  const lastSavedPosition = useRef(initialVideoPosition);
  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const saveProgress = useCallback(
    async (data: {
      completed?: boolean;
      video_position?: number;
    }) => {
      try {
        const res = await apiPatch("/api/progress", {
            enrollment_id: enrollmentId,
            lesson_id: lessonId,
            ...data,
          });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Lỗi cập nhật tiến độ");
        }

        return await res.json();
      } catch (err) {
        throw err;
      }
    },
    [enrollmentId, lessonId]
  );

  const toggleCompleted = async () => {
    setIsLoading(true);
    try {
      await saveProgress({ completed: !isCompleted });
      setIsCompleted(!isCompleted);
      toast.success(
        !isCompleted
          ? "Đã đánh dấu hoàn thành bài học"
          : "Đã bỏ đánh dấu hoàn thành"
      );
      router.refresh();
    } catch {
      toast.error("Không thể cập nhật tiến độ");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-save video position every 15 seconds
  useEffect(() => {
    const videoEl = document.getElementById("lesson-video") as HTMLVideoElement | null;
    if (!videoEl) return;

    // Set initial position
    if (initialVideoPosition > 0) {
      videoEl.currentTime = initialVideoPosition;
    }

    saveTimerRef.current = setInterval(() => {
      if (!videoEl.paused && !videoEl.ended) {
        const currentTime = Math.floor(videoEl.currentTime);
        if (Math.abs(currentTime - lastSavedPosition.current) >= 10) {
          lastSavedPosition.current = currentTime;
          saveProgress({ video_position: currentTime }).catch(() => {
            // Silent fail for auto-save
          });
        }
      }
    }, 15000);

    // Save on pause
    const handlePause = () => {
      const currentTime = Math.floor(videoEl.currentTime);
      if (currentTime !== lastSavedPosition.current) {
        lastSavedPosition.current = currentTime;
        saveProgress({ video_position: currentTime }).catch(() => {});
      }
    };

    videoEl.addEventListener("pause", handlePause);

    return () => {
      if (saveTimerRef.current) {
        clearInterval(saveTimerRef.current);
      }
      videoEl.removeEventListener("pause", handlePause);
    };
  }, [initialVideoPosition, saveProgress]);

  return (
    <div className="flex items-center gap-3">
      <Button
        variant={isCompleted ? "default" : "outline"}
        onClick={toggleCompleted}
        disabled={isLoading}
        className="gap-2"
      >
        {isLoading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : isCompleted ? (
          <CheckCircle className="size-4" />
        ) : (
          <Circle className="size-4" />
        )}
        {isCompleted ? "Đã hoàn thành" : "Đánh dấu hoàn thành"}
      </Button>
    </div>
  );
}
