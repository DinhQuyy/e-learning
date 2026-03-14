"use client";

import { useState } from "react";
import { ArrowRight, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface NewsletterStripProps {
  reviewCount?: number;
}

export function NewsletterStrip({ reviewCount = 0 }: NewsletterStripProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Vui lòng nhập email.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Email không hợp lệ.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      if (res.ok) {
        toast.success("Đăng ký thành công! Cảm ơn bạn đã theo dõi.");
        setEmail("");
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "Đã có lỗi xảy ra, vui lòng thử lại.");
      }
    } catch {
      toast.error("Không thể kết nối, vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-14 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="learnify-newsletter rounded-3xl p-6 sm:p-8 lg:p-10">
          <div className="grid items-center gap-6 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-background/70 px-3 py-1 text-xs font-semibold text-[var(--learnify-heading)]">
                <Mail className="size-3.5" />
                Bản tin học tập mỗi tuần
              </p>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-[var(--learnify-heading)] sm:text-3xl">
                Nhận cập nhật khóa học và tài liệu mới nhất
              </h2>
              <p className="mt-2 text-sm text-[var(--learnify-body)]">
                {reviewCount > 0
                  ? `Đã có ${reviewCount}+ đánh giá tích cực từ học viên trên nền tảng.`
                  : "Nhận thông tin ưu đãi và gợi ý lộ trình học phù hợp với bạn."}
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex w-full max-w-xl flex-col gap-3 sm:flex-row"
            >
              <input
                type="email"
                placeholder="Nhập email của bạn"
                aria-label="Nhập email của bạn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="h-11 w-full rounded-xl border border-white/70 bg-white/95 px-4 text-sm text-[var(--learnify-heading)] shadow-sm outline-none placeholder:text-[var(--learnify-body)] focus:border-[var(--learnify-primary)] focus:ring-2 focus:ring-[var(--learnify-primary)]/20 disabled:opacity-60"
              />
              <Button
                type="submit"
                disabled={loading}
                className="learnify-btn-gradient h-11 rounded-xl px-5 text-sm font-semibold"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    Đăng ký
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
