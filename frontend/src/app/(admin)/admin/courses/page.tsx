import { requireAuth } from "@/lib/dal";
import { getAllCourses } from "@/lib/queries/admin";
import { directusUrl } from "@/lib/directus";
import type { Metadata } from "next";
import { AdminCoursesClient } from "./courses-client";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Quản lý khoá học - Quản trị",
};

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
  }>;
}

export default async function AdminCoursesPage({ searchParams }: PageProps) {
  const { token } = await requireAuth();
  const params = await searchParams;

  const page = Math.max(1, Number(params.page) || 1);
  const search = params.search || "";
  const status = params.status || "all";

  const result = await getAllCourses(token, {
    page,
    limit: 20,
    search: search || undefined,
    status: status !== "all" ? status : undefined,
  });

  const courses = result.data ?? [];
  const totalCount = result.meta?.filter_count ?? result.meta?.total_count ?? 0;
  const totalPages = Math.ceil(totalCount / 20);

  // Get pending count (courses in "review" status)
  const pendingRes = await fetch(
    `${directusUrl}/items/courses?aggregate[count]=id&filter[status][_eq]=review`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    }
  );
  const pendingCount = pendingRes.ok
    ? Number((await pendingRes.json()).data?.[0]?.count?.id ?? 0)
    : 0;

  return (
    <AdminCoursesClient
      courses={courses}
      currentPage={page}
      totalPages={totalPages}
      totalCount={totalCount}
      search={search}
      status={status}
      pendingCount={pendingCount}
    />
  );
}
