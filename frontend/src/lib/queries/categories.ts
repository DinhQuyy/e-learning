import { readItems, aggregate } from "@directus/sdk";
import { publicDirectus } from "../directus";
import type { Category } from "@/types";

export interface CategoryWithCount extends Category {
  course_count: number;
}

export async function getCategories(): Promise<CategoryWithCount[]> {
  const categories = await publicDirectus.request(
    readItems("categories", {
      filter: {
        status: { _eq: "published" },
      },
      sort: ["sort", "name"],
      fields: [
        "id",
        "name",
        "slug",
        "description",
        "icon",
        "parent_id",
        "sort",
        "status",
      ],
    })
  );

  const counts = await Promise.all(
    (categories as unknown as Category[]).map(async (cat) => {
      const result = await publicDirectus.request(
        aggregate("courses", {
          aggregate: { count: "*" },
          query: {
            filter: {
              status: { _eq: "published" },
              category_id: { _eq: cat.id },
            },
          },
        })
      );
      return {
        ...cat,
        course_count: Number(result?.[0]?.count ?? 0),
      } as CategoryWithCount;
    })
  );

  return counts;
}

export async function getCategoryBySlug(
  slug: string
): Promise<Category | null> {
  try {
    const results = await publicDirectus.request(
      readItems("categories", {
        filter: {
          slug: { _eq: slug },
          status: { _eq: "published" },
        },
        limit: 1,
        fields: [
          "id",
          "name",
          "slug",
          "description",
          "icon",
          "parent_id",
          "sort",
          "status",
        ],
      })
    );

    if (!results || results.length === 0) return null;
    return results[0] as unknown as Category;
  } catch {
    return null;
  }
}
