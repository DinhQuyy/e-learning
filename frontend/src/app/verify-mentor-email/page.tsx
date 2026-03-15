import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/dal";
import { verifyMentorNotificationEmailToken } from "@/lib/mentor-email-preferences";
import { getDashboardPath, type AppRole } from "@/lib/role-routing";

interface VerifyMentorEmailPageProps {
  searchParams: Promise<{ token?: string }>;
}

function getProfilePath(role: AppRole): string {
  if (role === "instructor") return "/instructor/profile";
  if (role === "admin") return "/admin/dashboard";
  return "/profile";
}

export default async function VerifyMentorEmailPage({
  searchParams,
}: VerifyMentorEmailPageProps) {
  const params = await searchParams;
  const session = await getSession();
  const result = await verifyMentorNotificationEmailToken(params.token);
  const isSuccess = result.status === "verified";

  const tokenOwnerRole = isSuccess ? result.role : "student";
  const tokenOwnerProfilePath = getProfilePath(tokenOwnerRole);
  const tokenOwnerDashboardPath = getDashboardPath(tokenOwnerRole);
  const sameUserSession =
    isSuccess && session ? session.user.id === result.userId : false;

  const primaryHref = isSuccess
    ? sameUserSession
      ? tokenOwnerProfilePath
      : `/login?redirect=${encodeURIComponent(tokenOwnerProfilePath)}`
    : "/login";
  const primaryLabel = isSuccess
    ? sameUserSession
      ? "Mở cài đặt hồ sơ"
      : "Đăng nhập để mở hồ sơ"
    : "Đăng nhập";

  const secondaryHref = isSuccess
    ? sameUserSession
      ? tokenOwnerDashboardPath
      : `/login?redirect=${encodeURIComponent(tokenOwnerDashboardPath)}`
    : "/";
  const secondaryLabel = isSuccess
    ? sameUserSession
      ? "Về bảng điều khiển"
      : "Đăng nhập để tiếp tục"
    : "Về trang chủ";

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center justify-center px-4 py-12">
      <Card className="w-full rounded-3xl border border-border/70 shadow-xl">
        <CardHeader className="space-y-2 border-b bg-gradient-to-r from-[#eef3ff] to-[#f6efff] px-6 py-6 text-left">
          <CardTitle className="text-2xl font-bold">
            {isSuccess ? "Xác minh email thành công" : "Không thể xác minh email"}
          </CardTitle>
          <CardDescription>
            {isSuccess
              ? `Email ${result.email} đã sẵn sàng nhận nhắc học từ AI Mentor.`
              : result.error}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-6 py-6">
          {isSuccess ? (
            <>
              <p className="text-sm text-muted-foreground">
                Từ bây giờ, các email nhắc học do giảng viên gửi sẽ ưu tiên tới
                email này nếu bạn vẫn bật nhận email mentor trong hồ sơ.
              </p>
              {!sameUserSession ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Liên kết này đã xác minh cho một tài khoản cụ thể. Để mở đúng
                  hồ sơ hoặc bảng điều khiển của tài khoản đó, hãy đăng nhập bằng
                  chính tài khoản vừa xác minh.
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Bạn có thể quay lại hồ sơ để kiểm tra email đang chờ xác minh và
              gửi lại liên kết mới nếu cần.
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap gap-3 px-6 pb-6">
          <Button asChild>
            <Link href={primaryHref}>{primaryLabel}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={secondaryHref}>{secondaryLabel}</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
