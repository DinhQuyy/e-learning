import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function StudentDashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="size-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-12" />
              <Skeleton className="mt-1 h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Courses */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="flex gap-4 p-4">
                <Skeleton className="size-20 shrink-0 rounded-lg" />
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="mt-2 h-3 w-3/4" />
                  </div>
                  <Skeleton className="mt-2 h-5 w-16 rounded-full" />
                </div>
              </div>
              <div className="border-t px-4 py-3">
                <Skeleton className="h-8 w-full" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
