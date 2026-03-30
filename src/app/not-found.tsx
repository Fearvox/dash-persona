'use client';

import Link from 'next/link';
import { t } from '@/lib/i18n';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <p
        className="text-6xl font-bold"
        style={{ color: 'var(--accent-green)', opacity: 0.3 }}
      >
        404
      </p>
      <h1
        className="text-2xl font-bold tracking-tight sm:text-3xl"
        style={{ color: 'var(--text-primary)' }}
      >
        {t('ui.notFound.title')}
      </h1>
      <p
        className="max-w-md text-sm leading-6"
        style={{ color: 'var(--text-secondary)' }}
      >
        {t('ui.notFound.description')}
      </p>
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="inline-flex h-12 items-center justify-center rounded-full px-8 text-sm font-semibold transition-colors"
          style={{
            background: 'var(--accent-green)',
            color: 'var(--bg-primary)',
          }}
        >
          {t('ui.notFound.backHome')}
        </Link>
        <Link
          href="/dashboard?source=demo&persona=tutorial"
          className="text-sm font-medium transition-colors hover:opacity-80"
          style={{ color: 'var(--text-subtle)' }}
        >
          {t('ui.notFound.tryDemo')}
        </Link>
      </div>
    </div>
  );
}
