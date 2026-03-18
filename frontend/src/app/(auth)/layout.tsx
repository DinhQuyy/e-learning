import Link from "next/link";
import { ArrowRight, BookOpen, Sparkles, TrendingUp } from "lucide-react";
import { KognifyLogo } from "@/components/layout/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#f7f9ff] via-background to-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -left-28 top-10 size-72 rounded-full bg-[#2f57ef]/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 bottom-10 size-72 rounded-full bg-[#b966e7]/15 blur-3xl" />

      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1fr_460px]">
        <section className="hidden rounded-3xl border border-[#2f57ef]/15 bg-card/90 p-8 shadow-lg backdrop-blur lg:block">
          <Link href="/">
            <KognifyLogo size="sm" />
          </Link>

          <h1 className="mt-6 text-3xl font-bold leading-tight text-foreground">
            Học trực tuyến để nâng cấp kỹ năng
            <span className="text-[#2f57ef]"> nhanh hơn</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Gia nhập cộng đồng học viên để tiếp cận khóa học chất lượng, giảng viên thực chiến
            và lộ trình học tập rõ ràng theo từng mục tiêu.
          </p>

          <div className="mt-8 space-y-3">
            <div className="flex items-start gap-3 rounded-2xl border bg-background p-3">
              <Sparkles className="mt-0.5 size-4 text-[#2f57ef]" />
              <div>
                <p className="text-sm font-semibold">Nội dung cập nhật liên tục</p>
                <p className="text-xs text-muted-foreground">Theo sát nhu cầu thị trường và công nghệ mới.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border bg-background p-3">
              <BookOpen className="mt-0.5 size-4 text-[#2f57ef]" />
              <div>
                <p className="text-sm font-semibold">Lộ trình học có hệ thống</p>
                <p className="text-xs text-muted-foreground">Từ cơ bản đến nâng cao với bài tập thực hành.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border bg-background p-3">
              <TrendingUp className="mt-0.5 size-4 text-[#2f57ef]" />
              <div>
                <p className="text-sm font-semibold">Theo dõi tiến độ rõ ràng</p>
                <p className="text-xs text-muted-foreground">Đo lường kết quả và giữ động lực học tập mỗi ngày.</p>
              </div>
            </div>
          </div>

          <Link href="/courses" className="mt-8 inline-flex items-center gap-1 text-sm font-semibold text-[#2f57ef] hover:underline">
            Khám phá khóa học
            <ArrowRight className="size-4" />
          </Link>
        </section>

        <div className="mx-auto w-full max-w-md lg:max-w-none">{children}</div>
      </div>
    </div>
  );
}
