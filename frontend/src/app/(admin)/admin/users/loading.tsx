import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminUsersLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-10 w-64 rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="size-10 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="size-8 rounded-md" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex justify-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="size-9 rounded-md" />
        ))}
      </div>
    </div>
  );
}
