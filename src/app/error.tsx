'use client';

import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <h1
        className="text-2xl font-bold tracking-tight sm:text-3xl"
        style={{ color: 'var(--text-primary)' }}
      >
        Something went wrong
      </h1>
      <p
        className="max-w-md text-sm leading-6"
        style={{ color: 'var(--text-secondary)' }}
      >
        An unexpected error occurred. You can try again or head back to the home
        page.
      </p>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-12 items-center justify-center rounded-full px-8 text-sm font-semibold transition-colors"
          style={{
            background: 'var(--accent-green)',
            color: 'var(--bg-primary)',
          }}
        >
          Try again
        </button>
        <Link
          href="/"
          className="text-sm font-medium transition-colors hover:opacity-80"
          style={{ color: 'var(--text-subtle)' }}
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
