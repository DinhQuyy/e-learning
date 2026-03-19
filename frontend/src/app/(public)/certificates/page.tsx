import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  Download,
  Eye,
  FileCheck2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const metadata: Metadata = {
  title: "Chứng chỉ",
  description:
    "Tìm hiểu cách nhận chứng chỉ hoàn thành khóa học với thông tin xác thực minh bạch.",
};

const highlights = [
  {
    icon: ShieldCheck,
    title: "Xác thực minh bạch",
    description:
      "Mỗi chứng chỉ có mã định danh riêng để đối chiếu nhanh thông tin khóa học và học viên.",
  },
  {
    icon: FileCheck2,
    title: "Nội dung chuẩn hóa",
    description:
      "Chứng chỉ thể hiện rõ kỹ năng, thời lượng học và ngày cấp theo định dạng nhất quán.",
  },
  {
    icon: LockKeyhole,
    title: "An toàn dữ liệu",
    description:
      "Thông tin cá nhân được ẩn bớt trên bản công khai, chỉ hiển thị dữ liệu cần thiết để xác minh.",
  },
];

const process = [
  {
    step: "Bước 1",
    title: "Hoàn thành 100% nội dung",
    description:
      "Xem toàn bộ bài học bắt buộc và đạt tiến độ hoàn thành của khóa học.",
  },
  {
    step: "Bước 2",
    title: "Đạt yêu cầu đánh giá",
    description:
      "Vượt qua bài kiểm tra cuối khóa hoặc đạt ngưỡng điểm tối thiểu do giảng viên quy định.",
  },
  {
    step: "Bước 3",
    title: "Nhận và tải chứng chỉ",
    description:
      "Hệ thống tự động phát hành chứng chỉ trong hồ sơ học tập, sẵn sàng tải PDF hoặc chia sẻ liên kết.",
  },
];

const recentCertificates = [
  {
    learner: "Nguyễn Minh Anh",
    course: "React Nâng Cao Cho Frontend Developer",
    issuedAt: "20/02/2026",
    level: "Nâng cao",
  },
  {
    learner: "Trần Quang Huy",
    course: "Phân tích dữ liệu với Python thực chiến",
    issuedAt: "18/02/2026",
    level: "Trung cấp",
  },
  {
    learner: "Lê Thanh Vy",
    course: "UI/UX Design System từ cơ bản đến nâng cao",
    issuedAt: "15/02/2026",
    level: "Cơ bản",
  },
];

const faqs = [
  {
    question: "Tôi có cần thanh toán thêm để nhận chứng chỉ không?",
    answer:
      "Không. Nếu khóa học của bạn bao gồm chứng chỉ, hệ thống sẽ cấp tự động khi bạn hoàn thành đủ điều kiện.",
  },
  {
    question: "Tôi có thể cấp lại chứng chỉ khi đổi tên hồ sơ không?",
    answer:
      "Có. Sau khi cập nhật thông tin hồ sơ, bạn có thể gửi yêu cầu cấp lại để đồng bộ dữ liệu trên chứng chỉ.",
  },
  {
    question: "Nhà tuyển dụng có thể kiểm tra chứng chỉ như thế nào?",
    answer:
      "Bạn có thể chia sẻ liên kết xác thực công khai. Người xem chỉ cần mở liên kết để kiểm tra tình trạng hợp lệ.",
  },
];

export default function CertificatesPage() {
  return (
    <div className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.15),transparent_38%),radial-gradient(circle_at_82%_18%,rgba(14,165,233,0.12),transparent_28%)]" />

      <section className="border-b bg-linear-to-b from-emerald-50/70 via-background to-background dark:from-emerald-950/10">
        <div className="mx-auto max-w-7xl px-4 pb-14 pt-14 sm:px-6 lg:px-8 lg:pb-18 lg:pt-18">
          <div className="mx-auto max-w-3xl text-center">
            <Badge
              variant="secondary"
              className="border border-emerald-200/80 bg-emerald-100/70 text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200"
            >
              Chứng chỉ xác thực
            </Badge>
            <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Chứng nhận kết quả học tập rõ ràng và chuyên nghiệp
            </h1>
            <p className="mt-5 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              Hoàn thành khóa học, đạt yêu cầu đánh giá và nhận chứng chỉ ngay
              trên hồ sơ của bạn. Dùng để bổ sung CV, portfolio hoặc chia sẻ với
              nhà tuyển dụng.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/courses">
                  Khám phá khóa học
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/register">Tạo tài khoản học viên</Link>
              </Button>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-card/75 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <BadgeCheck className="size-5 text-emerald-600 dark:text-emerald-400" />
                <p className="text-sm font-medium">Cấp tự động khi đủ điều kiện</p>
              </div>
            </div>
            <div className="rounded-xl border bg-card/75 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <CalendarClock className="size-5 text-sky-600 dark:text-sky-400" />
                <p className="text-sm font-medium">
                  Lưu trữ lịch sử cấp chứng chỉ theo thời gian
                </p>
              </div>
            </div>
            <div className="rounded-xl border bg-card/75 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <Download className="size-5 text-amber-600 dark:text-amber-400" />
                <p className="text-sm font-medium">Tải PDF hoặc chia sẻ liên kết</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-7">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Vì sao chứng chỉ trên nền tảng đáng tin cậy?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Mọi chứng chỉ đều có thông tin tiêu chuẩn và cơ chế xác thực để tăng
            độ tin cậy khi sử dụng trong môi trường học thuật hoặc tuyển dụng.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {highlights.map((item) => (
            <Card key={item.title} className="rounded-2xl">
              <CardHeader className="gap-3">
                <div className="flex size-11 items-center justify-center rounded-full bg-primary/10">
                  <item.icon className="size-5 text-primary" />
                </div>
                <CardTitle className="text-xl">{item.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {item.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y bg-muted/30">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">
              Quy trình nhận chứng chỉ
            </h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Chỉ với 3 bước đơn giản, bạn có thể hoàn thành khóa học và nhận
              chứng chỉ có thể xác minh trực tuyến.
            </p>

            <div className="mt-6 space-y-4">
              {process.map((item) => (
                <Card key={item.step} className="rounded-xl">
                  <CardHeader className="gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                      {item.step}
                    </p>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          <Card className="h-fit rounded-2xl border-primary/20 bg-linear-to-br from-card to-muted/40">
            <CardHeader>
              <div className="inline-flex w-fit items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs">
                <Award className="size-3.5 text-primary" />
                Mẫu hiển thị chứng chỉ
              </div>
              <CardTitle className="text-2xl">Certificate of Completion</CardTitle>
              <CardDescription>
                Đây là bố cục minh họa để bạn hình dung chứng chỉ sau khi hoàn
                thành khóa học.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border bg-background p-5 shadow-sm">
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  Kiwi
                </p>
                <p className="mt-4 text-2xl font-semibold">Nguyễn Văn A</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Đã hoàn thành khóa học
                </p>
                <p className="mt-1 text-base font-medium">
                  Fullstack Web Development thực chiến
                </p>
                <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Ngày cấp</p>
                    <p className="font-medium">24/02/2026</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Mã xác thực</p>
                    <p className="font-medium">EL-2A9K-8QX4</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">
              Chứng chỉ được cấp gần đây
            </h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Danh sách minh họa các chứng chỉ mới nhất vừa được phát hành trên hệ
              thống.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/register">Tạo tài khoản để theo dõi của bạn</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {recentCertificates.map((item) => (
            <Card key={`${item.learner}-${item.issuedAt}`} className="rounded-xl">
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="secondary">{item.level}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {item.issuedAt}
                  </span>
                </div>
                <CardTitle className="text-lg">{item.learner}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {item.course}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-4" />
                  Hợp lệ
                </span>
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <Eye className="size-4" />
                  Xem
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t bg-muted/20">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Câu hỏi thường gặp</h2>
            <Accordion type="single" collapsible className="mt-5 w-full">
              {faqs.map((item, index) => (
                <AccordionItem key={item.question} value={`faq-${index}`}>
                  <AccordionTrigger>{item.question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <Card className="h-fit rounded-2xl bg-linear-to-br from-primary to-primary/80 text-primary-foreground">
            <CardHeader>
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1 text-xs">
                <Sparkles className="size-3.5" />
                Sẵn sàng cho mục tiêu nghề nghiệp
              </div>
              <CardTitle className="text-2xl">
                Bắt đầu học để nhận chứng chỉ đầu tiên
              </CardTitle>
              <CardDescription className="text-primary-foreground/85">
                Chọn lộ trình phù hợp, học đều mỗi ngày và sở hữu chứng chỉ có thể
                xác minh để tăng độ tin cậy cho hồ sơ năng lực.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-primary-foreground/90">
              <p>• Hàng trăm khóa học theo nhiều lĩnh vực.</p>
              <p>• Lưu tiến độ học tập trên mọi thiết bị.</p>
              <p>• Theo dõi chứng chỉ tập trung trong hồ sơ cá nhân.</p>
            </CardContent>
            <CardContent className="pt-0">
              <Button variant="secondary" className="w-full sm:w-auto" asChild>
                <Link href="/register">
                  Đăng ký miễn phí
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
