import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  Headphones,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Bảng giá",
  description:
    "Chọn gói học phù hợp với mục tiêu của bạn. Minh bạch chi phí, linh hoạt nâng cấp.",
};

type PricingPlan = {
  id: string;
  name: string;
  subtitle: string;
  price: string;
  period?: string;
  badge?: string;
  featured?: boolean;
  action: string;
  href: string;
  features: string[];
  note: string;
};

const plans: PricingPlan[] = [
  {
    id: "starter",
    name: "Cơ bản",
    subtitle: "Phù hợp để bắt đầu và trải nghiệm nền tảng",
    price: "0đ",
    period: "/tháng",
    action: "Bắt đầu miễn phí",
    href: "/register",
    features: [
      "Truy cập các khóa học miễn phí",
      "Lưu tiến độ học trên mọi thiết bị",
      "Tham gia cộng đồng học viên",
      "Nhận bản tin cập nhật hàng tuần",
    ],
    note: "Không yêu cầu thẻ thanh toán.",
  },
  {
    id: "pro",
    name: "Pro",
    subtitle: "Tăng tốc học tập với đầy đủ công cụ chuyên sâu",
    price: "299.000đ",
    period: "/tháng",
    badge: "Phổ biến nhất",
    featured: true,
    action: "Nâng cấp Pro",
    href: "/register",
    features: [
      "Mở toàn bộ thư viện khóa học premium",
      "Chứng chỉ hoàn thành có xác thực",
      "Bài tập thực chiến + phản hồi từ giảng viên",
      "Tải tài liệu và học ngoại tuyến",
      "Ưu tiên hỗ trợ kỹ thuật trong 24h",
    ],
    note: "Hoàn tiền trong 7 ngày nếu không hài lòng.",
  },
  {
    id: "business",
    name: "Doanh nghiệp",
    subtitle: "Đào tạo đội ngũ với quản trị và báo cáo tập trung",
    price: "Liên hệ",
    badge: "Cho đội nhóm",
    action: "Nhận tư vấn",
    href: "/register?role=instructor",
    features: [
      "Tất cả quyền lợi gói Pro",
      "Quản lý nhiều học viên theo phòng ban",
      "Dashboard theo dõi hiệu suất học tập",
      "Lộ trình tùy biến theo mục tiêu doanh nghiệp",
      "CSKH riêng và SLA cam kết",
    ],
    note: "Có xuất hóa đơn VAT đầy đủ.",
  },
];

type CompareValue = boolean | string;

const comparisonRows: Array<{
  feature: string;
  starter: CompareValue;
  pro: CompareValue;
  business: CompareValue;
}> = [
  {
    feature: "Khóa học miễn phí",
    starter: true,
    pro: true,
    business: true,
  },
  {
    feature: "Khóa học premium",
    starter: false,
    pro: true,
    business: true,
  },
  {
    feature: "Bài tập có phản hồi giảng viên",
    starter: false,
    pro: "Không giới hạn",
    business: "Không giới hạn",
  },
  {
    feature: "Chứng chỉ hoàn thành",
    starter: false,
    pro: true,
    business: true,
  },
  {
    feature: "Báo cáo tiến độ đội nhóm",
    starter: false,
    pro: false,
    business: true,
  },
  {
    feature: "Quản lý học viên theo phòng ban",
    starter: false,
    pro: false,
    business: true,
  },
  {
    feature: "Hỗ trợ ưu tiên",
    starter: "Email",
    pro: "24h",
    business: "SLA riêng",
  },
];

const faqs = [
  {
    question: "Tôi có thể hủy gói Pro bất kỳ lúc nào không?",
    answer:
      "Có. Bạn có thể hủy bất cứ lúc nào trong trang tài khoản. Quyền lợi Pro vẫn được giữ đến hết chu kỳ đã thanh toán.",
  },
  {
    question: "Tôi có được hoàn tiền nếu không phù hợp?",
    answer:
      "Có. Gói Pro hỗ trợ hoàn tiền trong 7 ngày đầu kể từ thời điểm thanh toán đầu tiên.",
  },
  {
    question: "Doanh nghiệp muốn đào tạo theo lộ trình riêng thì sao?",
    answer:
      "Đội ngũ của chúng tôi sẽ khảo sát nhu cầu, thiết kế lộ trình phù hợp và triển khai dashboard theo dõi riêng cho doanh nghiệp.",
  },
  {
    question: "Có hỗ trợ hóa đơn VAT không?",
    answer:
      "Có. Cả gói Pro và Doanh nghiệp đều có thể xuất hóa đơn VAT theo thông tin đơn vị của bạn.",
  },
];

function renderCompareCell(value: CompareValue) {
  if (typeof value === "string") {
    return <span className="font-medium text-foreground">{value}</span>;
  }

  return value ? (
    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
      <Check className="size-4" />
      Có
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <X className="size-4" />
      Không
    </span>
  );
}

export default function PricingPage() {
  return (
    <div className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_45%),radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.12),transparent_30%)]" />

      <section className="border-b bg-linear-to-b from-amber-50/80 via-background to-background dark:from-amber-950/10">
        <div className="mx-auto max-w-7xl px-4 pb-14 pt-16 sm:px-6 lg:px-8 lg:pb-20 lg:pt-20">
          <div className="mx-auto max-w-3xl text-center motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
            <Badge
              variant="secondary"
              className="border border-amber-200/70 bg-amber-100/70 text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200"
            >
              Bảng giá minh bạch
            </Badge>
            <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Chọn gói học phù hợp để bứt tốc sự nghiệp
            </h1>
            <p className="mt-5 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              Dù bạn mới bắt đầu hay đang đào tạo cả đội ngũ, nền tảng luôn có
              gói linh hoạt với chi phí rõ ràng, không phát sinh bất ngờ.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/register">
                  Bắt đầu miễn phí
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/courses">Xem danh sách khóa học</Link>
              </Button>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-card/75 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-5 text-emerald-600 dark:text-emerald-400" />
                <p className="text-sm font-medium">Hoàn tiền trong 7 ngày</p>
              </div>
            </div>
            <div className="rounded-xl border bg-card/75 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <Headphones className="size-5 text-sky-600 dark:text-sky-400" />
                <p className="text-sm font-medium">Hỗ trợ nhanh qua email</p>
              </div>
            </div>
            <div className="rounded-xl border bg-card/75 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <BadgeCheck className="size-5 text-amber-600 dark:text-amber-400" />
                <p className="text-sm font-medium">Nâng cấp hoặc hạ gói linh hoạt</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                "relative h-full rounded-2xl border bg-card/90",
                plan.featured &&
                  "border-primary shadow-lg shadow-primary/15 dark:shadow-primary/20"
              )}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-6">
                  <Badge
                    className={cn(
                      plan.featured
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    )}
                  >
                    {plan.badge}
                  </Badge>
                </div>
              )}

              <CardHeader className="gap-3">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.subtitle}</CardDescription>
                <div className="pt-2">
                  <p className="text-3xl font-bold tracking-tight sm:text-4xl">
                    {plan.price}
                    {plan.period && (
                      <span className="ml-1 text-base font-medium text-muted-foreground">
                        {plan.period}
                      </span>
                    )}
                  </p>
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">{plan.note}</p>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.featured ? "default" : "outline"}
                  asChild
                >
                  <Link href={plan.href}>{plan.action}</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-7">
            <h2 className="text-2xl font-bold sm:text-3xl">So sánh nhanh tính năng</h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Bảng dưới giúp bạn chọn đúng gói theo nhu cầu học cá nhân hoặc đội
              nhóm.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border bg-background">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted/50 text-left">
                <tr className="border-b">
                  <th className="px-4 py-3 font-semibold">Tính năng</th>
                  <th className="px-4 py-3 font-semibold">Cơ bản</th>
                  <th className="px-4 py-3 font-semibold">Pro</th>
                  <th className="px-4 py-3 font-semibold">Doanh nghiệp</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.feature} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-medium">{row.feature}</td>
                    <td className="px-4 py-3">{renderCompareCell(row.starter)}</td>
                    <td className="px-4 py-3">{renderCompareCell(row.pro)}</td>
                    <td className="px-4 py-3">{renderCompareCell(row.business)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <h2 className="text-2xl font-bold sm:text-3xl">Câu hỏi thường gặp</h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Nếu bạn cần thêm thông tin trước khi thanh toán, có thể xem nhanh các
            câu trả lời bên dưới.
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

        <Card className="h-fit rounded-2xl bg-linear-to-br from-primary to-primary/80 text-primary-foreground">
          <CardHeader>
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1 text-xs">
              <Sparkles className="size-3.5" />
              Tư vấn nhanh trong 30 phút
            </div>
            <CardTitle className="text-2xl">Cần gói riêng cho tổ chức?</CardTitle>
            <CardDescription className="text-primary-foreground/80">
              Nhận đề xuất lộ trình đào tạo theo mục tiêu KPI của đội ngũ và quy
              mô nhân sự thực tế.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-primary-foreground/90">
            <p>• Thiết kế khung năng lực theo từng vị trí.</p>
            <p>• Báo cáo tiến độ học tập theo thời gian thực.</p>
            <p>• Hỗ trợ triển khai onboarding cho học viên mới.</p>
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <Button variant="secondary" className="w-full sm:w-auto" asChild>
              <Link href="/register?role=instructor">Đặt lịch tư vấn</Link>
            </Button>
            <Button
              variant="outline"
              className="w-full border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 sm:w-auto"
              asChild
            >
              <Link href="mailto:sales@elearning.vn">sales@elearning.vn</Link>
            </Button>
          </CardFooter>
        </Card>
      </section>
    </div>
  );
}
