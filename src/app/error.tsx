'use client';

import Link from 'next/link';
import { t } from '@/lib/i18n';

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
        className="text-2xl font-bold tracking-tight sm:text-3xl text-[var(--text-primary)]"
      >
        {t('ui.error.title')}
      </h1>
      <p
        className="max-w-md text-sm leading-6 text-[var(--text-secondary)]"
      >
        {t('ui.error.description')}
      </p>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-12 items-center justify-center rounded-full px-8 text-sm font-semibold transition-colors bg-[var(--accent-green)] text-[var(--bg-primary)]"
        >
          {t('ui.error.tryAgain')}
        </button>
        <Link
          href="/"
          className="text-sm font-medium transition-colors hover:opacity-80 text-[var(--text-subtle)]"
        >
          {t('ui.error.backHome')}
        </Link>
      </div>
    </div>
  );
}
