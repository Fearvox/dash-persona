'use client';

import { useState, useEffect } from 'react';
import { getLocale, setLocale, type Locale } from '@/lib/i18n';

export function LocaleToggle() {
  const [locale, setLocaleState] = useState<Locale>('zh');

  useEffect(() => {
    setLocaleState(getLocale());
  }, []);

  function toggle() {
    const next: Locale = locale === 'zh' ? 'en' : 'zh';
    setLocale(next);
    setLocaleState(next);
    window.dispatchEvent(new Event('locale-changed'));
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
      aria-label={locale === 'zh' ? 'Switch to English' : '切换为中文'}
    >
      {locale === 'zh' ? 'EN' : '中文'}
    </button>
  );
}
