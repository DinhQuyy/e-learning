"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Star,
  CheckCircle,
  EyeOff,
  Trash2,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { getAssetUrl } from "@/lib/directus";
import { apiPatch, apiDelete } from "@/lib/api-fetch";

interface ReviewData {
  id: number;
  rating: number;
  comment: string | null;
  status: string;
  date_created: string;
  user_id: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar: string | null;
    email: string;
  } | null;
  course_id: {
    id: number;
    title: string;
    slug: string;
  } | null;
}

interface ReviewModerationClientProps {
  pendingReviews: ReviewData[];
  approvedReviews: ReviewData[];
  hiddenReviews: ReviewData[];
  initialStatus: string;
  pendingCount: number;
  approvedCount: number;
  hiddenCount: number;
}

export function ReviewModerationClient({
  pendingReviews,
  approvedReviews,
  hiddenReviews,
  initialStatus,
  pendingCount,
  approvedCount,
  hiddenCount,
}: ReviewModerationClientProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [processing, setProcessing] = useState(false);

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = (reviews: ReviewData[]) => {
    setSelectedIds(new Set(reviews.map((r) => r.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleAction = async (
    reviewId: number,
    action: "approve" | "hide" | "delete"
  ) => {
    try {
      let method = "PATCH";
      let body: Record<string, unknown> = {};

      if (action === "approve") {
        body = { status: "approved" };
      } else if (action === "hide") {
        body = { status: "hidden" };
      } else {
        method = "DELETE";
      }

      const res = method === "DELETE"
        ? await apiDelete(`/api/admin/reviews/${reviewId}`)
        : await apiPatch(`/api/admin/reviews/${reviewId}`, body);

      if (!res.ok) throw new Error();

      const messages = {
        approve: "Đã duyệt đánh giá",
        hide: "Đã ẩn đánh giá",
        delete: "Đã xoá đánh giá",
      };

      toast.success(messages[action]);
      router.refresh();
    } catch {
      toast.error("Có lỗi xảy ra");
    }
  };

  const handleBatchAction = async (action: "approve" | "hide") => {
    if (selectedIds.size === 0) return;
    setProcessing(true);

    try {
      const promises = Array.from(selectedIds).map((id) =>
        apiPatch(`/api/admin/reviews/${id}`, {
          status: action === "approve" ? "approved" : "hidden",
        })
      );

      await Promise.all(promises);

      toast.success(
        action === "approve"
          ? `Đã duyệt ${selectedIds.size} đánh giá`
          : `Đã ẩn ${selectedIds.size} đánh giá`
      );
      setSelectedIds(new Set());
      router.refresh();
    } catch {
      toast.error("Có lỗi xảy ra");
    } finally {
      setProcessing(false);
    }
  };

  const getUserName = (review: ReviewData) => {
    if (!review.user_id) return "N/A";
    return (
      [review.user_id.first_name, review.user_id.last_name]
        .filter(Boolean)
        .join(" ") || review.user_id.email
    );
  };

  const renderReviewCard = (review: ReviewData, showCheckbox: boolean) => {
    const userName = getUserName(review);

    return (
      <div
        key={review.id}
        className="rounded-lg border p-4 transition-colors hover:bg-gray-50"
      >
        <div className="flex items-start gap-3">
          {showCheckbox && (
            <Checkbox
              checked={selectedIds.has(review.id)}
              onCheckedChange={() => toggleSelection(review.id)}
              className="mt-1"
            />
          )}
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage
              src={getAssetUrl(review.user_id?.avatar ?? null)}
              alt={userName}
            />
            <AvatarFallback className="text-xs">
              {userName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">{userName}</span>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${
                        i < review.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(review.date_created), {
                  addSuffix: true,
                  locale: vi,
                })}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Khoá học:{" "}
              <span className="font-medium text-foreground">
                {review.course_id?.title ?? "---"}
              </span>
            </p>
            {review.comment && (
              <p className="mt-2 text-sm">{review.comment}</p>
            )}
            <div className="mt-3 flex items-center gap-2">
              {review.status === "pending" && (
                <>
                  <Button
                    size="xs"
                    onClick={() => handleAction(review.id, "approve")}
                  >
                    <CheckCircle className="mr-1 h-3.5 w-3.5" />
                    Duyệt
                  </Button>
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => handleAction(review.id, "hide")}
                  >
                    <EyeOff className="mr-1 h-3.5 w-3.5" />
                    Ẩn
                  </Button>
                </>
              )}
              {review.status === "approved" && (
                <Button
                  size="xs"
                  variant="secondary"
                  onClick={() => handleAction(review.id, "hide")}
                >
                  <EyeOff className="mr-1 h-3.5 w-3.5" />
                  Ẩn
                </Button>
              )}
              {review.status === "hidden" && (
                <Button
                  size="xs"
                  onClick={() => handleAction(review.id, "approve")}
                >
                  <CheckCircle className="mr-1 h-3.5 w-3.5" />
                  Duyệt lại
                </Button>
              )}
              <Button
                size="xs"
                variant="destructive"
                onClick={() => handleAction(review.id, "delete")}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Xoá
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Kiểm duyệt đánh giá
        </h1>
        <p className="text-gray-500">
          Quản lý và kiểm duyệt đánh giá khoá học từ học viên
        </p>
      </div>

      {/* Batch Actions */}
      {selectedIds.size > 0 && (
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <span className="text-sm font-medium">
              Đã chọn {selectedIds.size} đánh giá
            </span>
            <Button
              size="sm"
              onClick={() => handleBatchAction("approve")}
              disabled={processing}
            >
              <CheckCheck className="mr-1 h-4 w-4" />
              Duyệt tất cả
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleBatchAction("hide")}
              disabled={processing}
            >
              <EyeOff className="mr-1 h-4 w-4" />
              Ẩn tất cả
            </Button>
            <Button size="sm" variant="outline" onClick={clearSelection}>
              Bỏ chọn
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue={initialStatus}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            Chờ duyệt
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1.5">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">
            Đã duyệt ({approvedCount})
          </TabsTrigger>
          <TabsTrigger value="hidden">
            Đã ẩn ({hiddenCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                Đánh giá chờ duyệt ({pendingCount})
              </CardTitle>
              {pendingReviews.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectAll(pendingReviews)}
                >
                  Chọn tất cả
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingReviews.length === 0 ? (
                <p className="py-8 text-center text-gray-500">
                  Không có đánh giá nào chờ duyệt.
                </p>
              ) : (
                pendingReviews.map((review) =>
                  renderReviewCard(review, true)
                )
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Đánh giá đã duyệt ({approvedCount})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {approvedReviews.length === 0 ? (
                <p className="py-8 text-center text-gray-500">
                  Không có đánh giá nào đã duyệt.
                </p>
              ) : (
                approvedReviews.map((review) =>
                  renderReviewCard(review, false)
                )
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hidden" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Đánh giá đã ẩn ({hiddenCount})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {hiddenReviews.length === 0 ? (
                <p className="py-8 text-center text-gray-500">
                  Không có đánh giá nào bị ẩn.
                </p>
              ) : (
                hiddenReviews.map((review) =>
                  renderReviewCard(review, false)
                )
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
