"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";
import { Loader2, MessageSquareText } from "lucide-react";
import type { Review } from "@/types";

interface ReviewReplyFormProps {
  review: Review;
}

export function ReviewReplyForm({ review }: ReviewReplyFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reply, setReply] = useState(review.instructor_reply ?? "");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(!!review.instructor_reply);

  const handleSubmit = async () => {
    const trimmed = reply.trim();
    if (!trimmed) {
      toast.error("Vui lòng nhập nội dung phản hồi.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch(`/api/instructor/reviews/${review.id}/reply`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: trimmed }),
      });

      if (res.ok) {
        toast.success("Đã lưu phản hồi.");
        setSaved(true);
        setIsOpen(false);
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "Không thể lưu phản hồi.");
      }
    } catch {
      toast.error("Đã có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="mt-2 w-fit text-xs"
        onClick={() => setIsOpen(true)}
      >
        <MessageSquareText className="mr-1 size-3.5" />
        {saved ? "Sửa phản hồi" : "Phản hồi"}
      </Button>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <Textarea
        placeholder="Nhập phản hồi của bạn..."
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        rows={3}
        maxLength={2000}
        disabled={loading}
        className="text-sm"
      />
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSubmit} disabled={loading}>
          {loading && <Loader2 className="mr-1 size-3.5 animate-spin" />}
          Gửi phản hồi
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsOpen(false);
            setReply(review.instructor_reply ?? "");
          }}
          disabled={loading}
        >
          Huỷ
        </Button>
        <span className="text-xs text-muted-foreground">
          {reply.length}/2000
        </span>
      </div>
    </div>
  );
}
