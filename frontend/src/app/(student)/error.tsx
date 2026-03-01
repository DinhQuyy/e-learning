"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function StudentErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("Student area error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <AlertTriangle className="size-12 text-destructive/60" />
          <h2 className="text-xl font-bold">Đã xảy ra lỗi</h2>
          <p className="text-muted-foreground text-sm">
            Không thể tải trang này. Vui lòng thử lại.
          </p>
          <div className="flex gap-3">
            <Button onClick={reset}>Thử lại</Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/dashboard")}
            >
              Về Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
