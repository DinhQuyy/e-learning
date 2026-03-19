"use client";

import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AiTrustTone } from "@/lib/ai-ui-types";
import { cn } from "@/lib/utils";

export function AiSidePanelShell({
  badgeLabel,
  title,
  description,
  onRefresh,
  refreshLabel = "Làm mới",
  trustTone = "grounded",
  children,
  className,
}: {
  badgeLabel: string;
  title: string;
  description: string;
  onRefresh?: () => void;
  refreshLabel?: string;
  trustTone?: AiTrustTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "ai-side-panel-shell flex h-full min-h-0 flex-col rounded-[28px]",
        `ai-side-panel-shell--${trustTone}`,
        className
      )}
    >
      <div className="ai-side-panel-shell__header px-4 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <Badge className={cn("ai-badge px-3 py-1", `ai-badge--${trustTone}`)}>
              <Sparkles className="size-3.5" />
              {badgeLabel}
            </Badge>
            <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
          </div>
          {onRefresh ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full rounded-full sm:w-auto"
              onClick={onRefresh}
            >
              {refreshLabel}
            </Button>
          ) : null}
        </div>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
