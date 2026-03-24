import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10"
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      {/* Header skeleton */}
      <header className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-2 h-8 w-48" />
      </header>

      {/* Growth sparklines skeleton */}
      <section>
        <Skeleton className="mb-3 h-3 w-28" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-3 h-7 w-20" />
              <Skeleton className="mt-3 h-8 w-full" />
            </div>
          ))}
        </div>
      </section>

      {/* Persona score skeleton */}
      <section>
        <Skeleton className="mb-3 h-3 w-24" />
        <div className="card p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
            <div className="flex flex-col items-center gap-2">
              <Skeleton className="h-14 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="grid flex-1 gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="mt-2 h-6 w-12" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Platform summary skeleton */}
      <section>
        <Skeleton className="mb-3 h-3 w-36" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <Skeleton className="h-3 w-10" />
                  <Skeleton className="mt-1 h-5 w-12" />
                </div>
                <div>
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="mt-1 h-5 w-12" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
