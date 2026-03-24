export default function CompareLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10">
      {/* Header skeleton */}
      <header className="flex flex-col gap-2">
        <div
          className="h-4 w-24 animate-pulse rounded"
          style={{ background: 'var(--bg-card)' }}
        />
        <div
          className="mt-2 h-8 w-64 animate-pulse rounded"
          style={{ background: 'var(--bg-card)' }}
        />
        <div
          className="h-4 w-36 animate-pulse rounded"
          style={{ background: 'var(--bg-secondary)' }}
        />
      </header>

      {/* Metrics table skeleton */}
      <section>
        <div
          className="h-3 w-24 animate-pulse rounded"
          style={{ background: 'var(--bg-card)' }}
        />
        <div className="card mt-3 p-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-5 py-3"
              style={{
                borderBottom:
                  i < 5 ? '1px solid var(--border-subtle)' : 'none',
              }}
            >
              <div
                className="h-4 w-28 animate-pulse rounded"
                style={{ background: 'var(--bg-secondary)' }}
              />
              <div className="flex flex-1 justify-end gap-8">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div
                    key={j}
                    className="h-4 w-16 animate-pulse rounded"
                    style={{ background: 'var(--bg-secondary)' }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Insights skeleton */}
      <section>
        <div
          className="h-3 w-32 animate-pulse rounded"
          style={{ background: 'var(--bg-card)' }}
        />
        <div className="mt-3 flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="card h-16 animate-pulse px-5 py-4"
              style={{ borderLeft: '3px solid var(--bg-secondary)' }}
            />
          ))}
        </div>
      </section>

      {/* Content overlap skeleton */}
      <section>
        <div
          className="h-3 w-40 animate-pulse rounded"
          style={{ background: 'var(--bg-card)' }}
        />
        <div className="card mt-3">
          <div
            className="h-48 animate-pulse rounded-lg"
            style={{ background: 'var(--bg-secondary)' }}
          />
        </div>
      </section>

      {/* Score comparison skeleton */}
      <section>
        <div
          className="h-3 w-44 animate-pulse rounded"
          style={{ background: 'var(--bg-card)' }}
        />
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="card h-28 animate-pulse p-6"
              style={{ background: 'var(--bg-card)' }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
