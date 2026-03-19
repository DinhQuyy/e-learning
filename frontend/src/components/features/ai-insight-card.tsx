"use client";

import type { ReactNode } from "react";

import type { AiTrustTone } from "@/lib/ai-ui-types";
import { cn } from "@/lib/utils";

export function AiInsightCard({
  title,
  description,
  icon,
  badgeLabel,
  trustTone = "neutral",
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  badgeLabel?: string;
  trustTone?: AiTrustTone;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "ai-insight-card rounded-[24px] p-4",
        `ai-insight-card--${trustTone}`,
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            {icon ? (
              <span className={cn("ai-insight-card__icon inline-flex size-11 shrink-0 items-center justify-center rounded-2xl")}>
                {icon}
              </span>
            ) : null}
            <div className="min-w-0">
              {badgeLabel ? (
                <span className={cn("ai-badge ai-badge--soft ai-badge--neutral")}>{badgeLabel}</span>
              ) : null}
              <h3 className={cn("text-sm font-semibold text-slate-950", badgeLabel ? "mt-2" : "")}>{title}</h3>
              {description ? (
                <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
              ) : null}
            </div>
          </div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}
