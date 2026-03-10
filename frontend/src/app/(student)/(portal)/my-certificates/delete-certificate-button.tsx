"use client";

import { useState, type ComponentProps } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiDelete } from "@/lib/api-fetch";
import { Button } from "@/components/ui/button";

interface DeleteCertificateButtonProps {
  certificateId: string;
  courseTitle?: string | null;
  redirectTo?: string;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  className?: string;
}

export function DeleteCertificateButton({
  certificateId,
  courseTitle,
  redirectTo,
  variant = "outline",
  size = "sm",
  className,
}: DeleteCertificateButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    const courseLabel = courseTitle?.trim()
      ? ` cho khóa học "${courseTitle.trim()}"`
      : "";
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa chứng chỉ${courseLabel}?`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const res = await apiDelete(
        `/api/certificates/${encodeURIComponent(certificateId)}`
      );

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        const message =
          typeof payload?.error === "string"
            ? payload.error
            : "Không thể xóa chứng chỉ";
        throw new Error(message);
      }

      toast.success("Đã xóa chứng chỉ");

      if (redirectTo) {
        router.push(redirectTo);
        return;
      }

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể xóa chứng chỉ"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={handleDelete}
      disabled={isDeleting}
    >
      {isDeleting ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Trash2 className="size-4" />
      )}
      {isDeleting ? "Đang xóa..." : "Xóa chứng chỉ"}
    </Button>
  );
}
