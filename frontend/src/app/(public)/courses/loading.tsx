import { Skeleton } from "@/components/ui/skeleton";

export default function CoursesLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 space-y-3">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-64" />
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-9 w-full sm:max-w-sm" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-[160px]" />
          <Skeleton className="h-9 w-[150px]" />
          <Skeleton className="h-9 w-[150px]" />
        </div>
      </div>

      {/* Course grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border">
            <Skeleton className="aspect-video w-full" />
            <div className="space-y-3 p-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-10" />
              </div>
            </div>
            <div className="flex items-center justify-between border-t p-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
