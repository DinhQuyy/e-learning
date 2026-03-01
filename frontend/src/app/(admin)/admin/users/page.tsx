import { requireAuth } from "@/lib/dal";
import { getUsers } from "@/lib/queries/admin";
import type { Metadata } from "next";
import { AdminUsersClient } from "./users-client";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Quản lý người dùng - Quản trị",
};

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    role?: string;
    status?: string;
  }>;
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const { token } = await requireAuth();
  const params = await searchParams;

  const page = Number(params.page) || 1;
  const search = params.search || "";
  const role = params.role || "all";
  const status = params.status || "all";

  const result = await getUsers(token, {
    page,
    limit: 20,
    search: search || undefined,
    role: role !== "all" ? role : undefined,
    status: status !== "all" ? status : undefined,
  });

  const users = result.data ?? [];
  const totalCount = result.meta?.filter_count ?? result.meta?.total_count ?? 0;
  const totalPages = Math.ceil(totalCount / 20);

  return (
    <AdminUsersClient
      users={users}
      currentPage={page}
      totalPages={totalPages}
      totalCount={totalCount}
      search={search}
      role={role}
      status={status}
    />
  );
}
