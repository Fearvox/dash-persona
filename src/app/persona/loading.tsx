export default function PersonaLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10">
      {/* Header skeleton */}
      <header className="flex flex-col gap-4">
        <div
          className="h-4 w-24 animate-pulse rounded"
          style={{ background: 'var(--bg-card)' }}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div
            className="h-8 w-48 animate-pulse rounded"
            style={{ background: 'var(--bg-card)' }}
          />
          <div
            className="h-9 w-64 animate-pulse rounded-lg"
            style={{ background: 'var(--bg-secondary)' }}
          />
        </div>
      </header>

      {/* Overall score skeleton */}
      <div
        className="card flex items-center gap-8 p-6"
      >
        <div
          className="h-20 w-20 animate-pulse rounded-lg"
          style={{ background: 'var(--bg-secondary)' }}
        />
        <div className="flex flex-col gap-2">
          <div
            className="h-5 w-32 animate-pulse rounded"
            style={{ background: 'var(--bg-secondary)' }}
          />
          <div
            className="h-4 w-48 animate-pulse rounded"
            style={{ background: 'var(--bg-secondary)' }}
          />
        </div>
      </div>

      {/* Dimension grid skeleton */}
      <section>
        <div
          className="h-3 w-36 animate-pulse rounded"
          style={{ background: 'var(--bg-card)' }}
        />
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="card h-36 animate-pulse p-5"
              style={{ background: 'var(--bg-card)' }}
            />
          ))}
        </div>
      </section>

      {/* Tags skeleton */}
      <section>
        <div
          className="h-3 w-28 animate-pulse rounded"
          style={{ background: 'var(--bg-card)' }}
        />
        <div className="card mt-3 p-6">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-7 animate-pulse rounded-full"
                style={{
                  width: `${80 + i * 12}px`,
                  background: 'var(--bg-secondary)',
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Chart skeleton */}
      <section>
        <div
          className="h-3 w-44 animate-pulse rounded"
          style={{ background: 'var(--bg-card)' }}
        />
        <div className="card mt-3 p-6">
          <div
            className="h-64 w-full animate-pulse rounded-lg"
            style={{ background: 'var(--bg-secondary)' }}
          />
        </div>
      </section>
    </div>
  );
}
