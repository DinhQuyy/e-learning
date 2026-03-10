"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function CourseDetailError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("Course detail error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <AlertTriangle className="size-12 text-red-400" />
          <h2 className="text-xl font-bold text-gray-900">Không thể tải khoá học</h2>
          <p className="text-gray-500 text-sm">
            Khoá học không tồn tại hoặc đã xảy ra lỗi khi tải dữ liệu.
          </p>
          <div className="flex gap-3">
            <Button onClick={reset}>Thử lại</Button>
            <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-700" asChild>
              <Link href="/admin/courses">Quay lại danh sách</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
