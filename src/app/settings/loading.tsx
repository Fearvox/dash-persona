export default function SettingsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-10">
      {/* Header skeleton */}
      <header>
        <div
          className="h-4 w-24 animate-pulse rounded bg-[var(--bg-card)]"
        />
        <div
          className="mt-3 h-8 w-32 animate-pulse rounded bg-[var(--bg-card)]"
        />
      </header>

      {/* Learning Data skeleton */}
      <section>
        <div
          className="mb-4 h-3 w-28 animate-pulse rounded bg-[var(--bg-card)]"
        />
        <div className="card p-6">
          <div className="flex flex-col gap-4">
            <div
              className="h-4 w-full animate-pulse rounded bg-[var(--bg-card-hover)]"
            />
            <div
              className="h-4 w-3/4 animate-pulse rounded bg-[var(--bg-card-hover)]"
            />
            <div
              className="h-4 w-1/2 animate-pulse rounded bg-[var(--bg-card-hover)]"
            />
          </div>
        </div>
      </section>

      {/* About skeleton */}
      <section>
        <div
          className="mb-4 h-3 w-16 animate-pulse rounded bg-[var(--bg-card)]"
        />
        <div className="card p-6">
          <div className="flex flex-col gap-3">
            <div
              className="h-4 w-full animate-pulse rounded bg-[var(--bg-card-hover)]"
            />
            <div
              className="h-4 w-2/3 animate-pulse rounded bg-[var(--bg-card-hover)]"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
