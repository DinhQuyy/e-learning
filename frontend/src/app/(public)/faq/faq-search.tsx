"use client";

import { useState, useMemo } from "react";
import { Search, X, UserRound, CreditCard, GraduationCap, HelpCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type FaqItem = {
  question: string;
  answer: string;
};

export type FaqGroup = {
  title: string;
  description: string;
  iconName: string;
  items: FaqItem[];
};

interface FaqSearchProps {
  groups: FaqGroup[];
}

const iconMap: Record<string, LucideIcon> = {
  UserRound,
  CreditCard,
  GraduationCap,
};

function getIcon(name: string): LucideIcon {
  return iconMap[name] ?? HelpCircle;
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="rounded bg-yellow-200 px-0.5 dark:bg-yellow-800">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export function FaqSearch({ groups }: FaqSearchProps) {
  const [search, setSearch] = useState("");

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    const query = search.trim().toLowerCase();
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.question.toLowerCase().includes(query) ||
            item.answer.toLowerCase().includes(query)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, search]);

  const totalResults = filteredGroups.reduce(
    (sum, g) => sum + g.items.length,
    0
  );

  return (
    <div>
      {/* Search Bar */}
      <div className="mx-auto mb-8 max-w-xl">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Tìm kiếm câu hỏi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-12 rounded-xl pl-12 pr-12 text-base"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 size-8 -translate-y-1/2"
              onClick={() => setSearch("")}
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
        {search && (
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Tìm thấy {totalResults} kết quả
            {totalResults === 0 && " — thử từ khoá khác"}
          </p>
        )}
      </div>

      {/* FAQ Groups */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {filteredGroups.map((group) => {
          const Icon = getIcon(group.iconName);
          return (
            <Card key={group.title} className="rounded-2xl">
              <CardHeader className="gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="size-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{group.title}</CardTitle>
                    <CardDescription className="mt-1 text-sm">
                      {group.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Accordion
                  type="single"
                  collapsible
                  className="w-full"
                  defaultValue={search ? `${group.title}-0` : undefined}
                >
                  {group.items.map((item, index) => (
                    <AccordionItem
                      key={item.question}
                      value={`${group.title}-${index}`}
                    >
                      <AccordionTrigger className="text-left">
                        {highlightText(item.question, search)}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                        {highlightText(item.answer, search)}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {search && filteredGroups.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-lg font-medium text-muted-foreground">
            Không tìm thấy câu hỏi phù hợp
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Thử tìm với từ khoá khác hoặc liên hệ hỗ trợ
          </p>
        </div>
      )}
    </div>
  );
}
