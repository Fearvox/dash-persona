'use client';

import { useState, useEffect } from 'react';
import { t, getLocale, setLocale, type Locale } from '@/lib/i18n';

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
      suppressHydrationWarning
      className="font-mono text-[10px] tracking-wider px-2 py-1 rounded transition-colors hover:opacity-80 text-[var(--text-subtle)] border border-[var(--border-subtle)]"
      aria-label={locale === 'zh' ? t('ui.a11y.toggleToEnglish') : t('ui.a11y.toggleToChinese')}
    >
      {locale === 'zh' ? t('ui.locale.showEn') : t('ui.locale.showZh')}
    </button>
  );
}
