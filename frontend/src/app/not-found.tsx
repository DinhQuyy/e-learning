import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <FileQuestion className="size-20 text-muted-foreground/30" />
      <h1 className="mt-6 text-4xl font-bold">404</h1>
      <h2 className="mt-2 text-xl font-semibold">Không tìm thấy trang</h2>
      <p className="mt-3 max-w-md text-muted-foreground">
        Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển. Vui lòng kiểm
        tra lại đường dẫn hoặc quay về trang chủ.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <Button asChild>
          <Link href="/">Về trang chủ</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/courses">Xem khóa học</Link>
        </Button>
      </div>
    </div>
  );
}
