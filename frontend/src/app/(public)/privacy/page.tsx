import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  CalendarClock,
  Cookie,
  Database,
  Eye,
  Lock,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Chính sách bảo mật",
  description:
    "Mô tả cách E-Learning thu thập, sử dụng, lưu trữ và bảo vệ dữ liệu cá nhân của người dùng.",
};

type PrivacySection = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  items: string[];
};

const privacyHighlights = [
  "Chỉ thu thập dữ liệu cần thiết để vận hành dịch vụ và hỗ trợ học tập.",
  "Không bán dữ liệu cá nhân cho bên thứ ba dưới bất kỳ hình thức nào.",
  "Người dùng có quyền xem, chỉnh sửa hoặc yêu cầu xóa dữ liệu theo quy định.",
];

const privacySections: PrivacySection[] = [
  {
    id: "du-lieu-thu-thap",
    title: "Dữ liệu chúng tôi thu thập",
    description: "Các nhóm dữ liệu cần thiết để tạo tài khoản, cung cấp khóa học và hỗ trợ kỹ thuật.",
    icon: Database,
    items: [
      "Thông tin tài khoản như họ tên, email, số điện thoại và ảnh đại diện khi bạn đăng ký.",
      "Thông tin giao dịch như khóa học đã mua, phương thức thanh toán và lịch sử đơn hàng.",
      "Dữ liệu học tập như tiến độ bài học, kết quả bài kiểm tra, đánh giá khóa học và phản hồi hỗ trợ.",
      "Dữ liệu kỹ thuật như địa chỉ IP, loại thiết bị, trình duyệt và nhật ký truy cập nhằm đảm bảo an toàn hệ thống.",
    ],
  },
  {
    id: "muc-dich-su-dung",
    title: "Mục đích sử dụng dữ liệu",
    description: "Dữ liệu được sử dụng để cá nhân hóa trải nghiệm và duy trì chất lượng nền tảng.",
    icon: Eye,
    items: [
      "Xác thực tài khoản, đồng bộ tiến độ học tập và hiển thị nội dung phù hợp với từng người dùng.",
      "Xử lý thanh toán, cấp quyền truy cập khóa học và phát hành chứng chỉ khi đáp ứng điều kiện.",
      "Gửi thông báo quan trọng liên quan đến bảo mật, cập nhật dịch vụ hoặc thay đổi chính sách.",
      "Phân tích thống kê để cải thiện hiệu năng hệ thống, nội dung đào tạo và chất lượng hỗ trợ.",
    ],
  },
  {
    id: "chia-se-du-lieu",
    title: "Chia sẻ dữ liệu với bên thứ ba",
    description: "Việc chia sẻ chỉ diễn ra trong phạm vi cần thiết và có kiểm soát.",
    icon: Users,
    items: [
      "Chúng tôi chỉ chia sẻ dữ liệu với đối tác thanh toán, hạ tầng lưu trữ hoặc gửi email để vận hành dịch vụ.",
      "Các đối tác xử lý dữ liệu thay mặt chúng tôi phải tuân thủ thỏa thuận bảo mật và không được dùng sai mục đích.",
      "Dữ liệu có thể được cung cấp khi có yêu cầu hợp pháp từ cơ quan nhà nước theo quy định pháp luật.",
      "E-Learning không bán, cho thuê hoặc trao đổi dữ liệu cá nhân cho mục đích quảng cáo bên ngoài.",
    ],
  },
  {
    id: "cookies-va-theo-doi",
    title: "Cookie và công nghệ theo dõi",
    description: "Cookie giúp duy trì phiên đăng nhập và tối ưu trải nghiệm sử dụng.",
    icon: Cookie,
    items: [
      "Cookie thiết yếu được dùng để ghi nhớ trạng thái đăng nhập và bảo mật phiên làm việc.",
      "Cookie phân tích giúp chúng tôi đo lường hiệu năng, phát hiện lỗi và cải thiện giao diện.",
      "Bạn có thể tùy chỉnh hoặc tắt cookie trong trình duyệt, tuy nhiên một số tính năng có thể hoạt động không đầy đủ.",
    ],
  },
  {
    id: "luu-tru-va-bao-ve",
    title: "Lưu trữ và bảo vệ dữ liệu",
    description: "Nhiều lớp bảo vệ được áp dụng để giảm thiểu truy cập trái phép.",
    icon: Lock,
    items: [
      "Dữ liệu được mã hóa trong quá trình truyền tải và giới hạn truy cập theo vai trò nội bộ.",
      "Hệ thống theo dõi và cảnh báo truy cập bất thường nhằm kịp thời phát hiện rủi ro bảo mật.",
      "Thời gian lưu trữ dữ liệu được áp dụng theo mục đích sử dụng và yêu cầu pháp lý hiện hành.",
      "Khi không còn cần thiết, dữ liệu sẽ được ẩn danh hoặc xóa an toàn theo quy trình nội bộ.",
    ],
  },
  {
    id: "quyen-cua-nguoi-dung",
    title: "Quyền của người dùng",
    description: "Bạn chủ động quản lý dữ liệu cá nhân của mình trên nền tảng.",
    icon: ShieldCheck,
    items: [
      "Yêu cầu truy cập, chỉnh sửa hoặc cập nhật thông tin cá nhân chưa chính xác.",
      "Yêu cầu xóa tài khoản và dữ liệu liên quan khi không còn nhu cầu sử dụng dịch vụ.",
      "Rút lại đồng ý nhận thông báo tiếp thị bất kỳ lúc nào trong phần cài đặt tài khoản.",
      "Gửi khiếu nại về quyền riêng tư qua email để được xử lý theo quy trình hỗ trợ chính thức.",
    ],
  },
  {
    id: "cap-nhat-chinh-sach",
    title: "Cập nhật chính sách",
    description: "Chính sách có thể thay đổi theo yêu cầu vận hành, kỹ thuật hoặc pháp lý.",
    icon: CalendarClock,
    items: [
      "Phiên bản mới của chính sách sẽ được công bố công khai tại trang này cùng ngày hiệu lực.",
      "Với thay đổi quan trọng, chúng tôi sẽ thông báo trước qua email hoặc thông báo trong tài khoản.",
      "Việc tiếp tục sử dụng nền tảng sau ngày hiệu lực đồng nghĩa bạn đã đọc và đồng ý với phiên bản cập nhật.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.16),transparent_44%),radial-gradient(circle_at_88%_18%,rgba(34,197,94,0.12),transparent_28%)]" />

      <section className="border-b bg-linear-to-b from-cyan-50/80 via-background to-background dark:from-cyan-950/10">
        <div className="mx-auto max-w-7xl px-4 pb-14 pt-14 sm:px-6 lg:px-8 lg:pb-16 lg:pt-18">
          <div className="mx-auto max-w-3xl text-center">
            <Badge
              variant="secondary"
              className="border border-cyan-200/80 bg-cyan-100/70 text-cyan-900 dark:border-cyan-400/30 dark:bg-cyan-500/10 dark:text-cyan-200"
            >
              Chính sách bảo mật
            </Badge>
            <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Dữ liệu của bạn được bảo vệ bằng quy trình rõ ràng và minh bạch
            </h1>
            <p className="mt-5 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              Chính sách này mô tả cách E-Learning thu thập, sử dụng và bảo vệ thông tin cá nhân khi bạn đăng ký,
              học tập và thanh toán trên nền tảng.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
                Cập nhật lần cuối: 03/03/2026
              </span>
              <span className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
                Phiên bản: 1.0
              </span>
              <span className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
                Phạm vi: Toàn bộ dịch vụ E-Learning
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Card className="rounded-2xl border-primary/15 bg-card/80">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">Cam kết bảo vệ quyền riêng tư</CardTitle>
            <CardDescription>
              Ba nguyên tắc cốt lõi mà chúng tôi áp dụng trong toàn bộ vòng đời xử lý dữ liệu cá nhân.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {privacyHighlights.map((highlight) => (
              <div
                key={highlight}
                className="rounded-xl border bg-muted/40 p-4 text-sm leading-relaxed text-muted-foreground"
              >
                {highlight}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pb-14 sm:px-6 lg:grid-cols-12 lg:px-8">
        <aside className="lg:col-span-4">
          <Card className="sticky top-24 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg">Mục lục bảo mật</CardTitle>
              <CardDescription>Chọn mục để di chuyển nhanh đến nội dung bạn cần.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {privacySections.map((section) => (
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
          {privacySections.map((section) => (
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
            <CardTitle className="text-2xl sm:text-3xl">Liên hệ đội ngũ bảo mật và hỗ trợ pháp lý</CardTitle>
            <CardDescription>
              Nếu bạn cần giải thích thêm về quyền dữ liệu cá nhân, yêu cầu chỉnh sửa hoặc xóa thông tin, vui lòng gửi
              yêu cầu để được phản hồi trong thời gian sớm nhất.
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
              <Link href="mailto:privacy@elearning.vn">Gửi email quyền riêng tư</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
