'use client';

import { useState } from 'react';
import { getLocale, setLocale, type Locale } from '@/lib/i18n';

export function LocaleToggle() {
  const [locale, setLocaleState] = useState<Locale>(getLocale());

  function toggle() {
    const next: Locale = locale === 'zh' ? 'en' : 'zh';
    setLocale(next);
    setLocaleState(next);
    // Force full re-render — simplest approach for static i18n
    window.location.reload();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="font-mono text-[10px] tracking-wider px-2 py-1 rounded transition-colors hover:opacity-80"
      style={{
        color: 'var(--text-subtle)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {locale === 'zh' ? 'EN' : '中文'}
    </button>
  );
}
