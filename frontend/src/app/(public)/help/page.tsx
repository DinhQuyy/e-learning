import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookOpen,
  CreditCard,
  LifeBuoy,
  Mail,
  MessageSquare,
  PhoneCall,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = {
  title: "Trung tâm hỗ trợ",
  description:
    "Nhận hỗ trợ nhanh cho tài khoản, thanh toán và quá trình học tập trên nền tảng Kognify.",
};

type SupportTopic = {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  action: string;
};

const supportTopics: SupportTopic[] = [
  {
    icon: UserRound,
    title: "Tài khoản & đăng nhập",
    description:
      "Khắc phục lỗi quên mật khẩu, khóa tài khoản hoặc không nhận được email xác thực.",
    href: "/login",
    action: "Đi tới đăng nhập",
  },
  {
    icon: CreditCard,
    title: "Thanh toán & hóa đơn",
    description:
      "Hỗ trợ kiểm tra trạng thái đơn hàng, xuất hóa đơn VAT và hoàn tiền theo chính sách.",
    href: "/pricing",
    action: "Xem thông tin gói học",
  },
  {
    icon: BookOpen,
    title: "Khoá học & chứng chỉ",
    description:
      "Giải đáp về tiến độ học, bài kiểm tra, chứng chỉ hoàn thành và điều kiện cấp chứng chỉ.",
    href: "/certificates",
    action: "Xem trang chứng chỉ",
  },
  {
    icon: Settings2,
    title: "Thiết lập hồ sơ",
    description:
      "Cập nhật thông tin cá nhân, đổi ảnh đại diện và quản lý bảo mật tài khoản của bạn.",
    href: "/profile",
    action: "Mở hồ sơ của bạn",
  },
];

type ContactChannel = {
  icon: LucideIcon;
  title: string;
  value: string;
  description: string;
  href: string;
  note: string;
};

const contactChannels: ContactChannel[] = [
  {
    icon: Mail,
    title: "Email hỗ trợ",
    value: "support@elearning.vn",
    description: "Phù hợp cho yêu cầu kỹ thuật, thanh toán và tài khoản.",
    href: "mailto:support@elearning.vn",
    note: "Phản hồi trung bình trong 4 giờ làm việc.",
  },
  {
    icon: PhoneCall,
    title: "Hotline",
    value: "(028) 1234 5678",
    description: "Ưu tiên xử lý sự cố khẩn cấp ảnh hưởng trực tiếp đến học tập.",
    href: "tel:+842812345678",
    note: "Giờ làm việc: 08:00 - 21:00 (Thứ 2 - Chủ nhật).",
  },
  {
    icon: MessageSquare,
    title: "Yêu cầu tư vấn nhanh",
    value: "Đặt lịch 1:1 với CSKH",
    description: "Dành cho doanh nghiệp hoặc học viên cần lộ trình riêng.",
    href: "/register?role=instructor",
    note: "Đội ngũ liên hệ lại trong vòng 30 phút làm việc.",
  },
];

const processSteps = [
  {
    title: "Gửi yêu cầu",
    description:
      "Mô tả rõ vấn đề, đính kèm ảnh chụp màn hình và mã đơn hàng (nếu có).",
  },
  {
    title: "Xác nhận và phân loại",
    description:
      "Hệ thống tạo mã ticket, chuyển đúng bộ phận và gửi email xác nhận tự động.",
  },
  {
    title: "Xử lý và cập nhật",
    description:
      "Chúng tôi phản hồi theo SLA đã cam kết, cập nhật tiến độ cho đến khi hoàn tất.",
  },
];

const faqs = [
  {
    question: "Tôi quên mật khẩu và không nhận được email đặt lại, phải làm sao?",
    answer:
      "Bạn hãy kiểm tra thư mục Spam/Quảng cáo trước. Nếu vẫn không có email sau 5 phút, gửi yêu cầu về support@elearning.vn kèm địa chỉ email đăng ký để chúng tôi hỗ trợ thủ công.",
  },
  {
    question: "Tôi đã thanh toán nhưng chưa thấy khoá học trong tài khoản?",
    answer:
      "Đơn hàng có thể đang trong quá trình đối soát. Vui lòng chờ tối đa 10 phút, sau đó tải lại trang hoặc đăng xuất rồi đăng nhập lại. Nếu vẫn chưa cập nhật, gửi mã đơn hàng để được xử lý ngay.",
  },
  {
    question: "Tôi có thể hoàn tiền trong trường hợp nào?",
    answer:
      "Bạn có thể yêu cầu hoàn tiền theo chính sách của từng gói học. Với gói Pro, thời gian hỗ trợ hoàn tiền là 7 ngày kể từ thời điểm thanh toán đầu tiên.",
  },
  {
    question: "Doanh nghiệp có thể nhận hỗ trợ riêng không?",
    answer:
      "Có. Chúng tôi có kênh hỗ trợ riêng cho đội nhóm doanh nghiệp, bao gồm tư vấn lộ trình và cam kết SLA theo quy mô triển khai.",
  },
];

export default function HelpPage() {
  return (
    <div className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.14),transparent_42%),radial-gradient(circle_at_85%_20%,rgba(16,185,129,0.11),transparent_28%)]" />

      <section className="border-b bg-linear-to-b from-sky-50/70 via-background to-background dark:from-sky-950/10">
        <div className="mx-auto max-w-7xl px-4 pb-14 pt-14 sm:px-6 lg:px-8 lg:pb-18 lg:pt-18">
          <div className="mx-auto max-w-3xl text-center">
            <Badge
              variant="secondary"
              className="border border-sky-200/80 bg-sky-100/70 text-sky-900 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-200"
            >
              Trung tâm hỗ trợ
            </Badge>
            <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Hỗ trợ nhanh để bạn tiếp tục học tập không gián đoạn
            </h1>
            <p className="mt-5 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              Tìm câu trả lời cho các vấn đề thường gặp hoặc liên hệ đội ngũ CSKH
              khi bạn cần xử lý nhanh tài khoản, thanh toán và tiến độ học.
            </p>

            <div className="mt-8 rounded-2xl border bg-card/80 p-4 text-left backdrop-blur-sm">
              <p className="text-sm font-medium">Mô tả nhanh vấn đề của bạn</p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <Input
                  aria-label="Mô tả vấn đề hỗ trợ"
                  placeholder="Ví dụ: Tôi không đăng nhập được trên điện thoại..."
                />
                <Button asChild>
                  <Link href="mailto:support@elearning.vn">
                    Gửi yêu cầu
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
                Mã hỗ trợ tự động theo từng ticket
              </span>
              <span className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
                Ưu tiên phản hồi trong 24 giờ
              </span>
              <span className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
                Hỗ trợ tiếng Việt
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-7">
          <h2 className="text-2xl font-bold sm:text-3xl">Bạn cần hỗ trợ về gì?</h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Chọn nhóm nội dung phù hợp để đi đúng luồng hỗ trợ và tiết kiệm thời
            gian xử lý.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {supportTopics.map((topic) => (
            <Card key={topic.title} className="rounded-2xl">
              <CardHeader className="gap-3">
                <div className="flex size-11 items-center justify-center rounded-full bg-primary/10">
                  <topic.icon className="size-5 text-primary" />
                </div>
                <CardTitle className="text-xl">{topic.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {topic.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button variant="ghost" className="px-0" asChild>
                  <Link href={topic.href}>
                    {topic.action}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y bg-muted/25">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Kênh liên hệ trực tiếp</h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Khi cần hỗ trợ cá nhân hoá, bạn có thể chọn một trong các kênh dưới
              đây để đội ngũ chăm sóc khách hàng phản hồi.
            </p>

            <div className="mt-6 space-y-4">
              {contactChannels.map((channel) => (
                <Card key={channel.title} className="rounded-xl">
                  <CardHeader className="gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                        <channel.icon className="size-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{channel.title}</CardTitle>
                        <CardDescription>{channel.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2 pt-0 sm:flex-row sm:items-center sm:justify-between">
                    <Button variant="outline" asChild>
                      <Link href={channel.href}>{channel.value}</Link>
                    </Button>
                    <p className="text-xs text-muted-foreground">{channel.note}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card className="h-fit rounded-2xl bg-linear-to-br from-primary to-primary/80 text-primary-foreground">
            <CardHeader>
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1 text-xs">
                <LifeBuoy className="size-3.5" />
                Quy trình xử lý yêu cầu
              </div>
              <CardTitle className="text-2xl">
                Mỗi yêu cầu đều được theo dõi đến khi hoàn tất
              </CardTitle>
              <CardDescription className="text-primary-foreground/85">
                Chúng tôi ưu tiên minh bạch trạng thái và thời gian xử lý để bạn
                không bị gián đoạn trong quá trình học.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-primary-foreground/90">
              {processSteps.map((step, index) => (
                <div key={step.title} className="rounded-xl border border-primary-foreground/20 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-foreground/80">
                    Bước {index + 1}
                  </p>
                  <p className="mt-1 font-semibold">{step.title}</p>
                  <p className="mt-1 text-primary-foreground/80">{step.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <h2 className="text-2xl font-bold sm:text-3xl">Câu hỏi thường gặp</h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Một số tình huống phổ biến đã có hướng dẫn sẵn để bạn tự xử lý ngay.
          </p>
          <Accordion type="single" collapsible className="mt-6 w-full">
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

        <Card className="h-fit rounded-2xl border-primary/20 bg-linear-to-br from-card to-muted/40">
          <CardHeader>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs">
              <ShieldCheck className="size-3.5 text-primary" />
              Cam kết hỗ trợ
            </div>
            <CardTitle className="text-2xl">
              Luôn có người đồng hành khi bạn cần
            </CardTitle>
            <CardDescription>
              Từ lỗi kỹ thuật nhỏ đến yêu cầu đào tạo cho doanh nghiệp, đội ngũ
              hỗ trợ luôn sẵn sàng tiếp nhận và xử lý có trách nhiệm.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="flex items-start gap-2">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
              Theo dõi ticket theo từng giai đoạn xử lý.
            </p>
            <p className="flex items-start gap-2">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
              Chủ động cập nhật nếu thời gian xử lý kéo dài.
            </p>
            <p className="flex items-start gap-2">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
              Hướng dẫn chi tiết bằng tiếng Việt, dễ áp dụng.
            </p>
          </CardContent>
          <CardContent className="flex flex-col gap-3 pt-0 sm:flex-row">
            <Button className="w-full sm:w-auto" asChild>
              <Link href="mailto:support@elearning.vn">
                Liên hệ ngay
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" asChild>
              <Link href="/courses">Quay lại học tập</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
