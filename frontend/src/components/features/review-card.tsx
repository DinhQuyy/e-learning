import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RatingStars } from "@/components/features/rating-stars";
import { getAssetUrl } from "@/lib/directus";
import type { Review, DirectusUser } from "@/types";
import { MessageSquareText } from "lucide-react";

interface ReviewCardProps {
  review: Review;
  replySlot?: React.ReactNode;
}

function getReviewUser(review: Review): {
  name: string;
  avatar: string | null;
  initials: string;
} {
  const fallback = { name: "Học viên", avatar: null as string | null, initials: "HV" };
  const user = review.user_id as DirectusUser | string | null | undefined;

  if (!user || typeof user === "string") {
    return fallback;
  }

  const name =
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    user.email ||
    fallback.name;

  const initialsSource = `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`;
  const initials =
    initialsSource.trim().length > 0
      ? initialsSource.slice(0, 2).toUpperCase()
      : name.slice(0, 2).toUpperCase();

  return { name, avatar: user.avatar, initials };
}

export function ReviewCard({ review, replySlot }: ReviewCardProps) {
  const { name, avatar, initials } = getReviewUser(review);

  return (
    <div className="flex gap-4 rounded-lg border p-4">
      <Avatar className="size-10 shrink-0">
        <AvatarImage src={getAssetUrl(avatar)} alt={name} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-2">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">{name}</p>
            <RatingStars rating={review.rating} size="sm" showValue={false} />
          </div>
          <time
            className="text-xs text-muted-foreground"
            dateTime={review.date_created}
          >
            {formatDistanceToNow(new Date(review.date_created), {
              addSuffix: true,
              locale: vi,
            })}
          </time>
        </div>
        {review.comment && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {review.comment}
          </p>
        )}

        {/* Instructor reply */}
        {review.instructor_reply && (
          <div className="mt-3 rounded-lg border-l-2 border-primary/40 bg-muted/50 p-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
              <MessageSquareText className="size-3.5" />
              Phản hồi từ giảng viên
              {review.instructor_reply_at && (
                <span className="font-normal text-muted-foreground">
                  &middot;{" "}
                  {formatDistanceToNow(new Date(review.instructor_reply_at), {
                    addSuffix: true,
                    locale: vi,
                  })}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground/80">
              {review.instructor_reply}
            </p>
          </div>
        )}

        {replySlot}
      </div>
    </div>
  );
}
