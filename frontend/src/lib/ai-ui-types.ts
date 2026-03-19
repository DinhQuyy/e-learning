import type { AiSurface } from "@/lib/ai-schemas";

export type AiSurfaceStateKind =
  | "empty"
  | "loading"
  | "success"
  | "no-data"
  | "error"
  | "restricted";

export type AiTrustTone =
  | "grounded"
  | "advisory"
  | "restricted"
  | "caution"
  | "neutral";

export type AiFaqItem = {
  title: string;
  body: string;
  cta_label?: string;
  cta_prefill?: string;
  cta_href?: string;
};

export type AiFaqBlockConfig = {
  eyebrow?: string;
  title: string;
  description: string;
  items: AiFaqItem[];
  contextOverride?: Partial<{
    surface: AiSurface;
    title: string;
    description: string;
    starterPrompts: string[];
    currentPath: string;
    courseId: string;
    lessonId: string;
    courseTitle: string;
    lessonTitle: string;
  }>;
};
