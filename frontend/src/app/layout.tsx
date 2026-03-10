import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { AiHelpdeskWidget } from "@/components/features/ai-helpdesk-widget";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "E-Learning Platform",
    template: "%s | E-Learning",
  },
  description:
    "Nền tảng học trực tuyến hàng đầu Việt Nam. Học mọi thứ, mọi lúc, mọi nơi với các khóa học chất lượng cao.",
  keywords: ["học trực tuyến", "e-learning", "khóa học online", "giáo dục"],
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
        className={`${poppins.variable} font-sans antialiased`}
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
