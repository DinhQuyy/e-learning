"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Loader2, ShieldAlert, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AiSurfaceStateKind } from "@/lib/ai-ui-types";
import { cn } from "@/lib/utils";

const STYLE_MAP: Record<
  Exclude<AiSurfaceStateKind, "success">,
  {
    icon: ReactNode;
    iconClassName?: string;
  }
> = {
  empty: {
    icon: <Sparkles className="size-5" />,
  },
  loading: {
    icon: <Loader2 className="size-5 animate-spin" />,
  },
  "no-data": {
    icon: <Sparkles className="size-5" />,
  },
  error: {
    icon: <AlertTriangle className="size-5" />,
  },
  restricted: {
    icon: <ShieldAlert className="size-5" />,
  },
};

export function AiSurfaceState({
  state,
  title,
  description,
  actionLabel,
  onAction,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
}: {
  state: Exclude<AiSurfaceStateKind, "success">;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}) {
  const style = STYLE_MAP[state];
  const resolvedPrimaryActionLabel = primaryActionLabel ?? actionLabel;
  const resolvedPrimaryAction = onPrimaryAction ?? onAction;

  return (
    <div className={cn("ai-surface-state rounded-[22px] p-4", `ai-surface-state--${state}`, className)}>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "ai-surface-state__icon inline-flex size-10 shrink-0 items-center justify-center rounded-2xl",
            style.iconClassName
          )}
        >
          {style.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
          {resolvedPrimaryActionLabel && resolvedPrimaryAction ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={resolvedPrimaryAction}
              >
                {resolvedPrimaryActionLabel}
              </Button>
              {secondaryActionLabel && onSecondaryAction ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-full"
                  onClick={onSecondaryAction}
                >
                  {secondaryActionLabel}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
