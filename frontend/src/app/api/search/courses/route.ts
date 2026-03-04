import { NextResponse } from "next/server";
import { directusFetch } from "@/lib/directus-fetch";

interface SearchCourse {
  id: string;
  title: string;
  slug: string;
  thumbnail: string | null;
  total_lessons: number;
  total_enrollments: number;
  average_rating: number;
  price: number;
  discount_price: number | null;
}

function parseLimit(value: string | null): number {
  const parsed = Number(value ?? "");
  if (!Number.isFinite(parsed)) return 6;
  return Math.min(10, Math.max(1, Math.floor(parsed)));
}

function buildQuery(q: string, limit: number): string {
  const params = new URLSearchParams();
  params.set(
    "fields",
    "id,title,slug,thumbnail,total_lessons,total_enrollments,average_rating,price,discount_price"
  );
  params.set("filter[status][_eq]", "published");

  if (q) {
    params.set("filter[_or][0][title][_icontains]", q);
    params.set("filter[_or][1][short_description][_icontains]", q);
    params.set("filter[_or][2][description][_icontains]", q);
  }

  params.set("sort", "-total_enrollments,-average_rating,-date_created");
  params.set("limit", String(limit));

  return params.toString();
}

function mapCourse(item: Record<string, unknown>): SearchCourse {
  return {
    id: String(item.id ?? ""),
    title: String(item.title ?? ""),
    slug: String(item.slug ?? ""),
    thumbnail: (item.thumbnail as string | null | undefined) ?? null,
    total_lessons: Number(item.total_lessons ?? 0),
    total_enrollments: Number(item.total_enrollments ?? 0),
    average_rating: Number(item.average_rating ?? 0),
    price: Number(item.price ?? 0),
    discount_price:
      item.discount_price === null || item.discount_price === undefined
        ? null
        : Number(item.discount_price),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const limit = parseLimit(searchParams.get("limit"));

  try {
    const res = await directusFetch(`/items/courses?${buildQuery(q, limit)}`, {
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json({ data: [] }, { status: res.status });
    }

    const json = (await res.json()) as { data?: Array<Record<string, unknown>> };
    const data = Array.isArray(json.data) ? json.data.map(mapCourse) : [];
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}
