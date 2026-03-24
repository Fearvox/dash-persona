export default function CalendarLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10">
      {/* Header skeleton */}
      <header className="flex flex-col gap-2">
        <div
          className="h-4 w-24 animate-pulse rounded"
          style={{ background: 'var(--bg-card)' }}
        />
        <div
          className="mt-2 h-8 w-56 animate-pulse rounded"
          style={{ background: 'var(--bg-card)' }}
        />
        <div
          className="h-4 w-48 animate-pulse rounded"
          style={{ background: 'var(--bg-card)' }}
        />
      </header>

      {/* Top bar skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="h-8 w-16 animate-pulse rounded-md"
            style={{ background: 'var(--bg-card)' }}
          />
          <div
            className="h-5 w-44 animate-pulse rounded"
            style={{ background: 'var(--bg-card)' }}
          />
          <div
            className="h-8 w-16 animate-pulse rounded-md"
            style={{ background: 'var(--bg-card)' }}
          />
        </div>
        <div
          className="h-8 w-28 animate-pulse rounded-md"
          style={{ background: 'var(--bg-card)' }}
        />
      </div>

      {/* Calendar grid skeleton */}
      <div className="hidden md:grid md:grid-cols-7 md:gap-3">
        {Array.from({ length: 7 }).map((_, col) => (
          <div key={col} className="flex flex-col gap-2">
            <div
              className="h-8 animate-pulse rounded-lg"
              style={{ background: 'var(--bg-secondary)' }}
            />
            {Array.from({ length: 3 }).map((_, row) => (
              <div
                key={row}
                className="h-24 animate-pulse rounded-lg"
                style={{ background: 'var(--bg-secondary)' }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Mobile list skeleton */}
      <div className="flex flex-col gap-4 md:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <div
              className="h-10 animate-pulse rounded-t-lg"
              style={{ background: 'var(--bg-secondary)' }}
            />
            <div
              className="h-28 animate-pulse rounded-b-lg"
              style={{ background: 'var(--bg-card)' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
