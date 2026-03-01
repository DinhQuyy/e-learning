import { Skeleton } from "@/components/ui/skeleton";

export default function PublicLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Title skeleton */}
      <div className="mb-8 space-y-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-96" />
      </div>

      {/* Content skeletons */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-video w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
