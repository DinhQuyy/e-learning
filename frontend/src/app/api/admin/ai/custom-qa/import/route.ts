import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAiUserContext } from "@/lib/ai-auth";
import { postAiApiRaw } from "@/lib/ai-client";

const qaItemSchema = z.object({
  id: z.string().trim().optional(),
  question: z.string().trim().min(1),
  answer: z.string().trim().min(1),
  deep_link: z.string().trim().optional(),
  aliases: z.array(z.string().trim()).optional(),
  tags: z.array(z.string().trim()).optional(),
  notes: z.union([z.string().trim(), z.array(z.string().trim())]).optional(),
});

const aiImportResponseSchema = z.object({
  status: z.literal("ok"),
  set_name: z.string(),
  source_type: z.string(),
  replaced_deleted: z.number(),
  imported: z.number(),
  queued: z.number(),
  source_ids: z.array(z.string()),
});

const sourceTypeSchema = z.enum(["custom_qa", "faq"]);
const visibilitySchema = z.enum([
  "public",
  "enrolled_only",
  "instructor_only",
  "admin_only",
]);

function parseBooleanFlag(input: FormDataEntryValue | null): boolean {
  if (typeof input !== "string") return false;
  const value = input.trim().toLowerCase();
  return value === "1" || value === "true" || value === "on" || value === "yes";
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAiUserContext();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 2MB)" }, { status: 400 });
    }

    const rawText = await file.text();
    let rawJson: unknown;
    try {
      rawJson = JSON.parse(rawText);
    } catch {
      return NextResponse.json({ error: "Invalid JSON file" }, { status: 400 });
    }
    const rawItems =
      Array.isArray(rawJson)
        ? rawJson
        : rawJson && typeof rawJson === "object" && "items" in rawJson
          ? (rawJson as { items?: unknown }).items
          : null;

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json(
        { error: "Invalid JSON format: expected array or { items: [...] }" },
        { status: 400 }
      );
    }

    const parsedItems = z.array(qaItemSchema).safeParse(rawItems);
    if (!parsedItems.success) {
      return NextResponse.json(
        {
          error: "Invalid QA schema",
          detail: parsedItems.error.issues[0]?.message ?? "Unknown validation error",
        },
        { status: 400 }
      );
    }

    const setNameRaw = String(formData.get("set_name") ?? "custom-qa").trim();
    const setName = setNameRaw.length > 0 ? setNameRaw : "custom-qa";
    const sourceTypeParsed = sourceTypeSchema.safeParse(
      String(formData.get("source_type") ?? "custom_qa")
    );
    if (!sourceTypeParsed.success) {
      return NextResponse.json({ error: "Invalid source_type" }, { status: 400 });
    }
    const visibilityParsed = visibilitySchema.safeParse(
      String(formData.get("visibility") ?? "public")
    );
    if (!visibilityParsed.success) {
      return NextResponse.json({ error: "Invalid visibility" }, { status: 400 });
    }
    const sourceType = sourceTypeParsed.data;
    const visibility = visibilityParsed.data;
    const courseIdRaw = String(formData.get("course_id") ?? "").trim();
    const replaceSet = parseBooleanFlag(formData.get("replace_set"));

    const aiPayload = {
      set_name: setName,
      source_type: sourceType,
      visibility,
      course_id: courseIdRaw || null,
      replace_set: replaceSet,
      items: parsedItems.data,
    };

    const result = await postAiApiRaw("/v1/admin/custom-qa/import", aiPayload);
    const parsedResult = aiImportResponseSchema.safeParse(result);
    if (!parsedResult.success) {
      return NextResponse.json(
        { error: "Unexpected AI import response format" },
        { status: 502 }
      );
    }

    return NextResponse.json(parsedResult.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Custom QA import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
