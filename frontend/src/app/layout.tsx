import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "E-Learning Platform",
    template: "%s | E-Learning",
  },
  description:
    "Nen tang hoc truc tuyen hang dau Viet Nam. Hoc moi thu, moi luc, moi noi voi cac khoa hoc chat luong cao.",
  keywords: ["hoc truc tuyen", "e-learning", "khoa hoc online", "giao duc"],
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
        className={`${inter.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster richColors position="top-right" />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
