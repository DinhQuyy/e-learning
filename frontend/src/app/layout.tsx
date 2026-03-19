import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { AiHelpdeskWidget } from "@/components/features/ai-helpdesk-widget";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Kiwi",
    template: "%s | Kiwi",
  },
  description:
    "Kiwi — Nền tảng học trực tuyến hàng đầu Việt Nam. Nâng tầm nhận thức, học mọi lúc mọi nơi với các khóa học chất lượng cao.",
  keywords: ["Kiwi", "học trực tuyến", "e-learning", "khóa học online", "giáo dục"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${beVietnamPro.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            {children}
            <AiHelpdeskWidget />
            <Toaster richColors position="top-right" />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
