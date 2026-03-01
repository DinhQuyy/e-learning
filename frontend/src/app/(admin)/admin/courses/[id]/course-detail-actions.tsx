"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle, XCircle, Star, Archive, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { apiPatch } from "@/lib/api-fetch";

interface CourseDetailActionsProps {
  courseId: string;
  currentStatus: string;
  isFeatured: boolean;
}

export function CourseDetailActions({
  courseId,
  currentStatus,
  isFeatured,
}: CourseDetailActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (action: string, body: Record<string, unknown>) => {
    setLoading(action);
    try {
      const res = await apiPatch(`/api/admin/courses/${courseId}`, body);

      if (!res.ok) throw new Error();

      const messages: Record<string, string> = {
        approve: "Khoá học đã được duyệt",
        reject: "Khoá học đã bị từ chối",
        archive: "Khoá học đã được lưu trữ",
        feature: "Khoá học đã được đánh dấu nổi bật",
        unfeature: "Đã bỏ đánh dấu nổi bật",
      };

      toast.success(messages[action] ?? "Cập nhật thành công");
      router.refresh();
    } catch {
      toast.error("Có lỗi xảy ra");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-3">
      {currentStatus === "review" && (
        <>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="w-full" disabled={loading !== null}>
                {loading === "approve" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Duyệt khoá học
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Duyệt khoá học?</AlertDialogTitle>
                <AlertDialogDescription>
                  Khoá học sẽ được xuất bản và hiển thị cho tất cả học viên.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Huỷ</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    handleAction("approve", { status: "published" })
                  }
                >
                  Duyệt
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="w-full"
                disabled={loading !== null}
              >
                {loading === "reject" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="mr-2 h-4 w-4" />
                )}
                Từ chối
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Từ chối khoá học?</AlertDialogTitle>
                <AlertDialogDescription>
                  Khoá học sẽ bị chuyển về trạng thái bản nháp. Giảng viên sẽ
                  cần chỉnh sửa và gửi lại.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Huỷ</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleAction("reject", { status: "draft" })}
                >
                  Từ chối
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      <Button
        variant="outline"
        className="w-full"
        disabled={loading !== null}
        onClick={() =>
          handleAction(isFeatured ? "unfeature" : "feature", {
            is_featured: !isFeatured,
          })
        }
      >
        {loading === "feature" || loading === "unfeature" ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Star
            className={`mr-2 h-4 w-4 ${isFeatured ? "fill-yellow-400 text-yellow-400" : ""}`}
          />
        )}
        {isFeatured ? "Bỏ nổi bật" : "Đánh dấu nổi bật"}
      </Button>

      {currentStatus !== "archived" && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              className="w-full"
              disabled={loading !== null}
            >
              {loading === "archive" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Archive className="mr-2 h-4 w-4" />
              )}
              Lưu trữ
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Lưu trữ khoá học?</AlertDialogTitle>
              <AlertDialogDescription>
                Khoá học sẽ bị ẩn khỏi danh sách và không ai có thể đăng ký
                mới.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Huỷ</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  handleAction("archive", { status: "archived" })
                }
              >
                Lưu trữ
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
