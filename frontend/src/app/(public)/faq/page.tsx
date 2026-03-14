import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeHelp,
  BookOpenCheck,
  CircleHelp,
  MessageCircleQuestion,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FaqSearch } from "./faq-search";

export const metadata: Metadata = {
  title: "Câu hỏi thường gặp",
  description: "Tổng hợp các câu hỏi thường gặp về tài khoản, thanh toán và quá trình học trên E-Learning.",
};

import type { FaqGroup } from "./faq-search";

const faqGroups: FaqGroup[] = [
  {
    title: "Tài khoản và bảo mật",
    description: "Những vấn đề liên quan đến đăng nhập, đổi mật khẩu và bảo vệ tài khoản.",
    iconName: "UserRound",
    items: [
      {
        question: "Tôi quên mật khẩu, làm sao để lấy lại?",
        answer:
          "Bạn chọn “Quên mật khẩu” tại trang đăng nhập, nhập email đã đăng ký và làm theo hướng dẫn trong email. Nếu chưa nhận được email sau 5 phút, hãy kiểm tra thư mục Spam hoặc Quảng cáo.",
      },
      {
        question: "Tài khoản bị đăng xuất liên tục là do đâu?",
        answer:
          "Tình trạng này thường xảy ra khi bạn đăng nhập trên quá nhiều thiết bị hoặc trình duyệt chặn cookie. Hãy đăng xuất khỏi các thiết bị không dùng, sau đó đăng nhập lại và bật cookie cho trang web.",
      },
      {
        question: "Làm sao đổi email hoặc số điện thoại trong hồ sơ?",
        answer:
          "Bạn vào trang Hồ sơ, cập nhật thông tin cần thay đổi và xác thực lại bằng mật khẩu hiện tại. Với email mới, hệ thống sẽ gửi thư xác nhận trước khi áp dụng.",
      },
      {
        question: "Nền tảng có xác thực hai lớp không?",
        answer:
          "Có. Bạn có thể bật xác thực hai lớp trong phần Bảo mật tài khoản để tăng mức độ an toàn khi đăng nhập.",
      },
    ],
  },
  {
    title: "Thanh toán và đơn hàng",
    description: "Giải đáp về thanh toán, hóa đơn, kích hoạt khóa học và hoàn tiền.",
    iconName: "CreditCard",
    items: [
      {
        question: "Thanh toán thành công nhưng chưa thấy khóa học?",
        answer:
          "Vui lòng chờ tối đa 10 phút để hệ thống đối soát giao dịch. Sau đó tải lại trang hoặc đăng xuất, đăng nhập lại. Nếu vẫn chưa hiển thị, gửi mã đơn hàng cho bộ phận hỗ trợ để xử lý ngay.",
      },
      {
        question: "Tôi có thể xuất hóa đơn VAT không?",
        answer:
          "Có. Bạn gửi thông tin xuất hóa đơn trong vòng 7 ngày kể từ ngày thanh toán. Hóa đơn điện tử sẽ được gửi về email đăng ký sau khi xác minh thông tin doanh nghiệp.",
      },
      {
        question: "Khi nào tôi được hoàn tiền?",
        answer:
          "Chính sách hoàn tiền phụ thuộc từng gói học. Thông thường, bạn có thể yêu cầu hoàn tiền trong thời gian quy định nếu chưa học quá mức giới hạn theo điều khoản.",
      },
      {
        question: "Tôi có thể thanh toán bằng những phương thức nào?",
        answer:
          "Hiện tại hệ thống hỗ trợ thẻ nội địa, thẻ quốc tế, ví điện tử và chuyển khoản ngân hàng tùy theo khu vực và cổng thanh toán khả dụng.",
      },
    ],
  },
  {
    title: "Học tập và chứng chỉ",
    description: "Các câu hỏi về tiến độ học, bài kiểm tra và điều kiện nhận chứng chỉ.",
    iconName: "GraduationCap",
    items: [
      {
        question: "Tôi có thể học trên điện thoại không?",
        answer:
          "Có. Bạn có thể học trực tiếp trên trình duyệt điện thoại. Nội dung video, tài liệu và bài kiểm tra đều được tối ưu cho màn hình nhỏ.",
      },
      {
        question: "Video bị giật hoặc không phát được thì xử lý thế nào?",
        answer:
          "Bạn nên kiểm tra tốc độ mạng, chuyển sang độ phân giải thấp hơn và tắt các tiện ích chặn quảng cáo có thể ảnh hưởng đến trình phát video.",
      },
      {
        question: "Điều kiện để nhận chứng chỉ là gì?",
        answer:
          "Bạn cần hoàn thành toàn bộ bài học bắt buộc và đạt điểm tối thiểu ở các bài kiểm tra theo yêu cầu của khóa học. Khi đủ điều kiện, chứng chỉ sẽ tự động tạo trong trang cá nhân.",
      },
      {
        question: "Tôi có thể học lại bài đã hoàn thành không?",
        answer:
          "Có. Bạn có thể xem lại không giới hạn trong thời gian còn quyền truy cập khóa học, trừ khi khóa có ghi chú giới hạn khác từ giảng viên.",
      },
    ],
  },
];

const quickTopics = [
  {
    icon: BadgeHelp,
    title: "Tài khoản mới",
    detail: "Đăng ký, xác minh email và thiết lập hồ sơ ban đầu.",
  },
  {
    icon: BookOpenCheck,
    title: "Lộ trình học",
    detail: "Theo dõi tiến độ, bài tập và mục tiêu theo tuần.",
  },
  {
    icon: MessageCircleQuestion,
    title: "Hỗ trợ kỹ thuật",
    detail: "Lỗi video, lỗi truy cập bài học hoặc lỗi nộp bài.",
  },
];

export default function FaqPage() {
  return (
    <div className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.16),transparent_42%),radial-gradient(circle_at_82%_18%,rgba(16,185,129,0.12),transparent_28%)]" />

      <section className="border-b bg-linear-to-b from-sky-50/70 via-background to-background dark:from-sky-950/10">
        <div className="mx-auto max-w-7xl px-4 pb-14 pt-14 sm:px-6 lg:px-8 lg:pb-16 lg:pt-18">
          <div className="mx-auto max-w-3xl text-center">
            <Badge
              variant="secondary"
              className="border border-sky-200/80 bg-sky-100/70 text-sky-900 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-200"
            >
              Câu hỏi thường gặp
            </Badge>
            <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Giải đáp nhanh mọi thắc mắc trước khi bắt đầu học
            </h1>
            <p className="mt-5 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              Tổng hợp các câu hỏi phổ biến về tài khoản, thanh toán, học tập và chứng chỉ để bạn
              có thể tự xử lý ngay khi cần.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
                Cập nhật liên tục theo phản hồi học viên
              </span>
              <span className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
                Nội dung tiếng Việt dễ áp dụng
              </span>
              <span className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
                Tối ưu cho cả máy tính và điện thoại
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {quickTopics.map((topic) => (
            <Card key={topic.title} className="rounded-2xl border-primary/10 bg-card/70">
              <CardHeader className="gap-3">
                <div className="flex size-11 items-center justify-center rounded-full bg-primary/10">
                  <topic.icon className="size-5 text-primary" />
                </div>
                <CardTitle className="text-lg">{topic.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">{topic.detail}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y bg-muted/25">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <FaqSearch groups={faqGroups} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <Card className="rounded-2xl border-primary/20 bg-linear-to-br from-card to-muted/40">
          <CardHeader>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs">
              <ShieldCheck className="size-3.5 text-primary" />
              Cần hỗ trợ thêm?
            </div>
            <CardTitle className="text-2xl sm:text-3xl">
              Không thấy câu trả lời bạn đang tìm?
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Đội ngũ hỗ trợ sẽ phản hồi nhanh các câu hỏi liên quan đến tài khoản, thanh toán và
              sự cố kỹ thuật trong quá trình học.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button className="w-full sm:w-auto" asChild>
              <Link href="/help">
                Mở trung tâm hỗ trợ
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" asChild>
              <Link href="mailto:support@elearning.vn">
                Gửi email hỗ trợ
                <CircleHelp className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
