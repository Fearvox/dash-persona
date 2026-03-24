import { Skeleton } from '@/components/ui/skeleton';

export default function TimelineLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10"
      aria-busy="true"
      aria-label="Loading timeline"
    >
      {/* Header skeleton */}
      <header className="flex flex-col gap-4">
        <Skeleton className="h-4 w-24" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-56 rounded-lg" />
        </div>
      </header>

      {/* Summary stats skeleton */}
      <section className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-2 h-6 w-10" />
          </div>
        ))}
      </section>

      {/* Series filter pills skeleton */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-full" />
        ))}
      </div>

      {/* Tree lanes skeleton */}
      <div className="flex flex-col gap-6">
        {/* Branches lane */}
        <div>
          <Skeleton className="mb-2 h-3 w-16" />
          <div className="flex gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="card w-[260px] shrink-0 p-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="mt-3 h-4 w-40" />
                <Skeleton className="mt-2 h-3 w-full" />
                <Skeleton className="mt-3 h-6 w-10" />
              </div>
            ))}
          </div>
        </div>

        {/* Mainline lane */}
        <div>
          <Skeleton className="mb-2 h-3 w-16" />
          <div className="flex gap-4">
            <div className="card w-[260px] shrink-0 p-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="mt-3 h-4 w-40" />
              <Skeleton className="mt-2 h-3 w-full" />
              <Skeleton className="mt-3 h-6 w-10" />
            </div>
          </div>
        </div>

        {/* Boundaries lane */}
        <div>
          <Skeleton className="mb-2 h-3 w-20" />
          <div className="flex gap-4">
            <div className="card w-[260px] shrink-0 p-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="mt-3 h-4 w-40" />
              <Skeleton className="mt-2 h-3 w-full" />
              <Skeleton className="mt-3 h-6 w-10" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
