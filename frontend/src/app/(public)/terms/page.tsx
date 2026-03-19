import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  CalendarClock,
  CircleAlert,
  FileText,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Điều khoản sử dụng",
  description:
    "Quy định về quyền, nghĩa vụ và phạm vi trách nhiệm khi sử dụng nền tảng Kiwi.",
};

type TermSection = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  items: string[];
};

const keyNotes = [
  "Điều khoản áp dụng cho mọi tài khoản đăng ký và người truy cập nền tảng.",
  "Việc tiếp tục sử dụng dịch vụ đồng nghĩa bạn đồng ý với nội dung cập nhật mới nhất.",
  "Các vi phạm nghiêm trọng có thể dẫn đến tạm ngưng hoặc chấm dứt tài khoản mà không hoàn phí.",
];

const termSections: TermSection[] = [
  {
    id: "pham-vi-ap-dung",
    title: "Phạm vi áp dụng",
    description: "Điều khoản này chi phối toàn bộ hoạt động truy cập và học tập trên nền tảng.",
    icon: FileText,
    items: [
      "Điều khoản áp dụng cho học viên, giảng viên, quản trị viên và mọi người dùng truy cập website.",
      "Một số khóa học hoặc tính năng có thể có quy định bổ sung, được hiển thị riêng tại trang liên quan.",
      "Khi có xung đột giữa điều khoản chung và điều khoản riêng của khóa học, điều khoản riêng được ưu tiên áp dụng.",
    ],
  },
  {
    id: "tai-khoan-va-bao-mat",
    title: "Tài khoản và bảo mật",
    description: "Bạn chịu trách nhiệm với thông tin tài khoản và hoạt động phát sinh từ tài khoản của mình.",
    icon: ShieldCheck,
    items: [
      "Bạn cần cung cấp thông tin chính xác, đầy đủ và cập nhật trong quá trình đăng ký tài khoản.",
      "Không chia sẻ mật khẩu, mã xác thực hoặc quyền truy cập tài khoản cho bên thứ ba.",
      "Nếu phát hiện truy cập trái phép, bạn phải thông báo ngay cho chúng tôi qua support@elearning.vn.",
    ],
  },
  {
    id: "thanh-toan-va-hoan-tien",
    title: "Thanh toán và hoàn tiền",
    description: "Quy định về giá dịch vụ, ghi nhận giao dịch và điều kiện hoàn phí.",
    icon: Scale,
    items: [
      "Mức phí khóa học được hiển thị công khai tại thời điểm bạn đặt mua và có thể thay đổi theo chương trình khuyến mãi.",
      "Sau khi thanh toán thành công, hệ thống sẽ kích hoạt quyền truy cập trong thời gian phù hợp với gói học đã mua.",
      "Yêu cầu hoàn tiền chỉ được xử lý khi đáp ứng đúng chính sách hoàn tiền công bố tại thời điểm giao dịch.",
    ],
  },
  {
    id: "quyen-so-huu-tri-tue",
    title: "Quyền sở hữu trí tuệ",
    description: "Nội dung khóa học và hạ tầng kỹ thuật thuộc quyền sở hữu của nền tảng hoặc đối tác hợp pháp.",
    icon: FileText,
    items: [
      "Bạn chỉ được sử dụng nội dung cho mục đích học tập cá nhân, không sao chép hoặc phát tán thương mại khi chưa được phép.",
      "Mọi hành vi quay màn hình, tải xuống, chia sẻ trái phép hoặc bán lại nội dung đều bị nghiêm cấm.",
      "Nhãn hiệu, logo, giao diện và tài liệu trên website được pháp luật sở hữu trí tuệ bảo hộ.",
    ],
  },
  {
    id: "hanh-vi-bi-nghiem-cam",
    title: "Hành vi bị nghiêm cấm",
    description: "Các hành vi làm ảnh hưởng đến hệ thống, cộng đồng học tập hoặc quyền lợi của người dùng khác.",
    icon: CircleAlert,
    items: [
      "Đăng tải nội dung vi phạm pháp luật, sai sự thật, xúc phạm danh dự hoặc gây thù hằn.",
      "Can thiệp trái phép vào hệ thống, khai thác lỗ hổng, phát tán mã độc hoặc gian lận trong bài kiểm tra.",
      "Mạo danh cá nhân hoặc tổ chức khác để trục lợi, gây hiểu nhầm hoặc chiếm quyền truy cập trái phép.",
    ],
  },
  {
    id: "gioi-han-trach-nhiem",
    title: "Giới hạn trách nhiệm",
    description: "Chúng tôi nỗ lực duy trì dịch vụ ổn định nhưng không bảo đảm tuyệt đối trong mọi tình huống.",
    icon: ShieldCheck,
    items: [
      "Nền tảng không chịu trách nhiệm với thiệt hại gián tiếp phát sinh do gián đoạn mạng, sự cố thiết bị hoặc lỗi từ bên thứ ba.",
      "Chúng tôi có thể tạm dừng một phần dịch vụ để bảo trì, nâng cấp hoặc đảm bảo an toàn hệ thống.",
      "Trong mọi trường hợp hợp pháp, trách nhiệm bồi thường (nếu có) không vượt quá giá trị dịch vụ bạn đã thanh toán trong kỳ liên quan.",
    ],
  },
  {
    id: "cap-nhat-dieu-khoan",
    title: "Cập nhật điều khoản",
    description: "Điều khoản có thể được điều chỉnh để phù hợp pháp luật và định hướng vận hành.",
    icon: CalendarClock,
    items: [
      "Phiên bản mới sẽ được công bố tại trang này, kèm ngày hiệu lực rõ ràng.",
      "Khi thay đổi quan trọng, chúng tôi sẽ thông báo trước qua email hoặc thông báo trong tài khoản.",
      "Nếu bạn không đồng ý với nội dung cập nhật, bạn có thể ngừng sử dụng dịch vụ và yêu cầu hỗ trợ đóng tài khoản.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.14),transparent_42%),radial-gradient(circle_at_86%_18%,rgba(16,185,129,0.12),transparent_30%)]" />

      <section className="border-b bg-linear-to-b from-sky-50/70 via-background to-background dark:from-sky-950/10">
        <div className="mx-auto max-w-7xl px-4 pb-14 pt-14 sm:px-6 lg:px-8 lg:pb-16 lg:pt-18">
          <div className="mx-auto max-w-3xl text-center">
            <Badge
              variant="secondary"
              className="border border-sky-200/80 bg-sky-100/70 text-sky-900 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-200"
            >
              Điều khoản sử dụng
            </Badge>
            <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Minh bạch quyền lợi và trách nhiệm khi học trên Kiwi
            </h1>
            <p className="mt-5 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              Vui lòng đọc kỹ điều khoản trước khi đăng ký tài khoản, mua khóa học hoặc sử dụng bất kỳ tính năng
              nào trên nền tảng.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
                Hiệu lực từ: 03/03/2026
              </span>
              <span className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
                Phiên bản: 1.0
              </span>
              <span className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
                Áp dụng toàn nền tảng
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Card className="rounded-2xl border-primary/15 bg-card/80">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">Các điểm cần lưu ý</CardTitle>
            <CardDescription>
              Những nội dung quan trọng dưới đây giúp bạn nắm nhanh trước khi đọc chi tiết từng điều khoản.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {keyNotes.map((note) => (
              <div key={note} className="rounded-xl border bg-muted/40 p-4 text-sm leading-relaxed text-muted-foreground">
                {note}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pb-14 sm:px-6 lg:grid-cols-12 lg:px-8">
        <aside className="lg:col-span-4">
          <Card className="sticky top-24 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg">Mục lục điều khoản</CardTitle>
              <CardDescription>Chọn mục để di chuyển nhanh đến phần bạn cần.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {termSections.map((section) => (
                <Link
                  key={section.id}
                  href={`#${section.id}`}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted/60"
                >
                  <section.icon className="size-4 text-primary" />
                  <span>{section.title}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </aside>

        <div className="space-y-5 lg:col-span-8">
          {termSections.map((section) => (
            <Card key={section.id} id={section.id} className="scroll-mt-28 rounded-2xl">
              <CardHeader className="gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                    <section.icon className="size-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{section.title}</CardTitle>
                    <CardDescription className="mt-1 text-sm">{section.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ol className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                  {section.items.map((item, index) => (
                    <li key={item} className="flex items-start gap-3 rounded-lg border bg-muted/25 p-3">
                      <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {index + 1}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <Card className="rounded-2xl border-primary/20 bg-linear-to-br from-card to-muted/40">
          <CardHeader>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs">
              <ShieldCheck className="size-3.5 text-primary" />
              Cần tư vấn thêm?
            </div>
            <CardTitle className="text-2xl sm:text-3xl">Liên hệ khi bạn cần giải thích chi tiết điều khoản</CardTitle>
            <CardDescription>
              Đội ngũ hỗ trợ sẽ hướng dẫn cụ thể về phạm vi áp dụng, chính sách thanh toán và các tình huống xử lý
              tài khoản liên quan đến điều khoản sử dụng.
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
              <Link href="mailto:support@elearning.vn">Gửi email pháp lý</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
