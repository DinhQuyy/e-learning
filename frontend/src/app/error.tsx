"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <AlertTriangle className="size-20 text-destructive/50" />
      <h1 className="mt-6 text-2xl font-bold">Đã xảy ra lỗi</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Rất tiếc, đã có lỗi xảy ra khi xử lý yêu cầu của bạn. Vui lòng thử lại
        hoặc quay về trang chủ.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <Button onClick={reset}>Thử lại</Button>
        <Button variant="outline" onClick={() => (window.location.href = "/")}>
          Về trang chủ
        </Button>
      </div>
    </div>
  );
}
