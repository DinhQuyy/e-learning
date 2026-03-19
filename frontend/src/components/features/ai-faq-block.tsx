"use client";

import Link from "next/link";
import { ArrowRight, HelpCircle } from "lucide-react";

import { useAiUi } from "@/components/providers/ai-ui-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AiFaqBlockConfig } from "@/lib/ai-ui-types";

export function AiFaqBlock({ config }: { config: AiFaqBlockConfig }) {
  const { openChat } = useAiUi();

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.35)]">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          <HelpCircle className="size-5" />
        </span>
        <div className="min-w-0">
          {config.eyebrow ? (
            <Badge variant="outline" className="rounded-full border-slate-200 bg-white text-slate-600">
              {config.eyebrow}
            </Badge>
          ) : null}
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">{config.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{config.description}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {config.items.map((item) => {
          const action = item.cta_href ? (
            <Button asChild variant="outline" size="sm" className="w-full rounded-full sm:w-auto">
              <Link href={item.cta_href}>
                {item.cta_label || "Open"}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          ) : item.cta_prefill ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full rounded-full sm:w-auto"
              onClick={() =>
                openChat({
                  prefill: item.cta_prefill,
                  contextOverride: config.contextOverride,
                })
              }
            >
              {item.cta_label || "Hỏi AI"}
              <ArrowRight className="size-4" />
            </Button>
          ) : null;

          return (
            <div
              key={item.title}
              className="rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4"
            >
              <p className="text-sm font-semibold text-slate-950">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
              {action ? <div className="mt-4">{action}</div> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
