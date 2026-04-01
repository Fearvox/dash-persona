'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { setLocale, type Locale } from '@/lib/i18n';

/**
 * Reads locale from localStorage AFTER hydration, then re-keys children
 * to force all t() calls to pick up the new locale. This avoids
 * hydration mismatch (server always renders 'zh').
 * Also updates document.documentElement.lang so the HTML lang attribute
 * stays in sync with the active locale.
 */
export function LocaleInitializer({ children }: { children: ReactNode }) {
  const [renderKey, setRenderKey] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem('dash-locale') as Locale | null;
    if (stored && stored !== 'zh') {
      setLocale(stored);
      document.documentElement.lang = stored;
      setRenderKey(k => k + 1);
    } else {
      // Default to 'zh' (matches server-rendered html lang)
      document.documentElement.lang = 'zh';
    }

    function onLocaleChanged() {
      const next = (localStorage.getItem('dash-locale') as Locale) || 'zh';
      document.documentElement.lang = next;
      setRenderKey(k => k + 1);
    }
    window.addEventListener('locale-changed', onLocaleChanged);
    return () => window.removeEventListener('locale-changed', onLocaleChanged);
  }, []);

  return <div key={renderKey}>{children}</div>;
}
