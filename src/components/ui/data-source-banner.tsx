'use client';

import Link from 'next/link';
import { t } from '@/lib/i18n';

interface DataSourceBannerProps {
  source: 'real' | 'demo' | 'error' | 'empty';
  reason?: string;
}

export function DataSourceBanner({ source }: DataSourceBannerProps) {
  // Per D-03: when source === 'real', no banner
  if (source !== 'demo') return null;

  return (
    <div
      className="rounded-lg border border-[rgba(210,200,126,0.15)] bg-[rgba(210,200,126,0.04)] px-4 py-2.5 flex items-start gap-3"
      role="status"
    >
      <span className="mt-0.5 text-[var(--accent-yellow)] text-xs shrink-0">
        {t('ui.common.tip')}
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-xs text-[var(--text-subtle)] leading-relaxed">
          {t('ui.data.source.demoBanner')}
        </p>
        <Link
          href="/onboarding"
          className="text-xs font-medium text-[var(--accent-green)] hover:opacity-80 transition-opacity"
        >
          {t('ui.data.source.demoBannerAction')} &rarr;
        </Link>
      </div>
    </div>
  );
}
