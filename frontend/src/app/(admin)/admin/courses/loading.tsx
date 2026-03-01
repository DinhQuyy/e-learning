import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminCoursesLoading() {
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
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-2 h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-12 w-16 rounded" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="size-8 rounded-md" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
