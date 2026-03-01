"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText } from "lucide-react";
import type { Lesson, Course } from "@/types";
import { getAssetUrl } from "@/lib/directus";

interface LessonPreviewDialogProps {
  lesson: Lesson;
  course: Course;
  trigger: React.ReactNode;
}

export function LessonPreviewDialog({
  lesson,
  course,
  trigger,
}: LessonPreviewDialogProps) {
  if (!lesson.is_free) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background">
        <div className="flex flex-col max-h-[90vh]">
          {/* Header (Video Area for Video Lessons) */}
          <div className="bg-black relative group">
            {lesson.type === "video" && lesson.video_url ? (
              <>
                {lesson.video_url.includes("youtube") ||
                lesson.video_url.includes("vimeo") ? (
                  <div className="aspect-video w-full">
                    <iframe
                      src={lesson.video_url.replace("watch?v=", "embed/")}
                      className="w-full h-full"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  </div>
                ) : (
                  <video
                    src={getAssetUrl(lesson.video_url)}
                    controls
                    className="w-full aspect-video bg-black"
                    controlsList="nodownload"
                  />
                )}
              </>
            ) : (
              <div className="aspect-video w-full flex items-center justify-center bg-zinc-900 text-white">
                <div className="text-center p-6">
                  <FileText className="size-16 mx-auto mb-4 text-zinc-500" />
                  <h3 className="text-xl font-bold">Bài học văn bản</h3>
                  <p className="text-zinc-400">Xem nội dung bên dưới</p>
                </div>
              </div>
            )}
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <DialogHeader className="p-6 pb-2 border-b">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-xs">
                  {lesson.type === "video" ? "Video" : "Văn bản"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Khoá học: {course.title}
                </span>
              </div>
              <DialogTitle className="text-xl">{lesson.title}</DialogTitle>
            </DialogHeader>

            <ScrollArea className="flex-1 p-6">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {lesson.content ? (
                  <div
                    className="mt-4 pt-4 border-t"
                    dangerouslySetInnerHTML={{ __html: lesson.content }}
                  />
                ) : (
                  <p className="text-center text-muted-foreground italic">
                    (Không có nội dung mô tả)
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
