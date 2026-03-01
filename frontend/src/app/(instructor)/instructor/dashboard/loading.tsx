import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function InstructorDashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="size-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="mt-1 h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Enrollments Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="mt-1 h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-2 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Rating Distribution */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-36" />
            <Skeleton className="mt-1 h-4 w-28" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-8" />
                  <Skeleton className="h-2.5 flex-1 rounded-full" />
                  <Skeleton className="h-4 w-10" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
