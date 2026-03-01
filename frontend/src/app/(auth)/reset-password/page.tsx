import { Suspense } from "react";
import { ResetPasswordForm } from "./reset-password-form";
import { Skeleton } from "@/components/ui/skeleton";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-lg" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
