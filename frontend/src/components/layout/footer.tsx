import Link from "next/link";
import { BookOpen, Mail, Phone, MapPin } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { KognifyLogo } from "@/components/layout/logo";

const aboutLinks = [
  { href: "/help", label: "Về chúng tôi" },
  { href: "/courses", label: "Khóa học" },
  { href: "/categories", label: "Danh mục" },
  { href: "/faq", label: "FAQ" },
];

const quickLinks = [
  { href: "/courses", label: "Tất cả khóa học" },
  { href: "/categories", label: "Danh mục" },
  { href: "/become-instructor", label: "Trở thành giảng viên" },
  { href: "/certificates", label: "Chứng chỉ" },
];

const supportLinks = [
  { href: "/help", label: "Trung tâm hỗ trợ" },
  { href: "/faq", label: "Câu hỏi thường gặp" },
  { href: "/terms", label: "Điều khoản sử dụng" },
  { href: "/privacy", label: "Chính sách bảo mật" },
];

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <Link href="/">
              <KognifyLogo size="md" />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Nền tảng học trực tuyến hàng đầu Việt Nam. Học mọi thứ, mọi lúc,
              mọi nơi với các khóa học chất lượng từ những giảng viên giỏi nhất.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BookOpen className="size-4 shrink-0" />
              <span>Học không giới hạn</span>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Liên kết nhanh</h4>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Hỗ trợ</h4>
            <ul className="space-y-2.5">
              {supportLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Liên hệ</h4>
            <ul className="space-y-2.5">
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="size-4 shrink-0 mt-0.5" />
                <span>123 Nguyễn Văn Linh, Quận 7, TP. Hồ Chí Minh</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="size-4 shrink-0" />
                <span>(028) 1234 5678</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="size-4 shrink-0" />
                <span>support@kognify.vn</span>
              </li>
            </ul>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col items-center justify-between gap-4 py-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Kognify. Tất cả quyền được bảo lưu.
          </p>
          <div className="flex items-center gap-4">
            {aboutLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
