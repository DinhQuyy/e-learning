import { requireAuth } from "@/lib/dal";
import { getReviewsForModeration } from "@/lib/queries/admin";
import type { Metadata } from "next";
import { ReviewModerationClient } from "./reviews-client";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Kiểm duyệt đánh giá - Quản trị",
};

interface PageProps {
  searchParams: Promise<{
    status?: string;
  }>;
}

export default async function AdminReviewsPage({ searchParams }: PageProps) {
  const { token } = await requireAuth();
  const params = await searchParams;
  const status = params.status || "pending";

  const [pendingReviews, approvedReviews, hiddenReviews] = await Promise.all([
    getReviewsForModeration(token, "pending"),
    getReviewsForModeration(token, "approved"),
    getReviewsForModeration(token, "hidden"),
  ]);

  return (
    <ReviewModerationClient
      pendingReviews={pendingReviews}
      approvedReviews={approvedReviews}
      hiddenReviews={hiddenReviews}
      initialStatus={status}
      pendingCount={pendingReviews.length}
      approvedCount={approvedReviews.length}
      hiddenCount={hiddenReviews.length}
    />
  );
}
