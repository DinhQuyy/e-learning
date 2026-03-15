"use client";

import { useEffect, useState } from "react";
import { Check, Link as LinkIcon, Share2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ShareButton({ title, slug }: { title: string; slug: string }) {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [url, setUrl] = useState(() => {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
    return appUrl ? `${appUrl}/courses/${slug}` : `/courses/${slug}`;
  });

  useEffect(() => {
    const origin = window.location.origin.replace(/\/$/, "");
    setUrl(`${origin}/courses/${slug}`);
    setCanNativeShare(typeof navigator.share === "function");
  }, [slug]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Đã sao chép liên kết");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Không thể sao chép liên kết");
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
      } catch {
        // User cancelled share
      }
      return;
    }

    await handleCopyLink();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full">
          <Share2 className="mr-2 size-4" />
          Chia sẻ khóa học
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-56">
        <DropdownMenuItem onClick={handleCopyLink}>
          {copied ? (
            <Check className="mr-2 size-4 text-green-500" />
          ) : (
            <LinkIcon className="mr-2 size-4" />
          )}
          Sao chép liên kết
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            window.open(
              `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
              "_blank",
              "width=600,height=400"
            )
          }
        >
          <svg className="mr-2 size-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          Facebook
        </DropdownMenuItem>
        {canNativeShare ? (
          <DropdownMenuItem onClick={handleNativeShare}>
            <Share2 className="mr-2 size-4" />
            Thêm tùy chọn...
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
