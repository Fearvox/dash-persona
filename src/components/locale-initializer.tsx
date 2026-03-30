'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { setLocale, type Locale } from '@/lib/i18n';

/**
 * Reads locale from localStorage AFTER hydration, then re-keys children
 * to force all t() calls to pick up the new locale. This avoids
 * hydration mismatch (server always renders 'zh').
 */
export function LocaleInitializer({ children }: { children: ReactNode }) {
  const [renderKey, setRenderKey] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem('dash-locale') as Locale | null;
    if (stored && stored !== 'zh') {
      setLocale(stored);
      setRenderKey(k => k + 1);
    }

    function onLocaleChanged() {
      setRenderKey(k => k + 1);
    }
    window.addEventListener('locale-changed', onLocaleChanged);
    return () => window.removeEventListener('locale-changed', onLocaleChanged);
  }, []);

  return <div key={renderKey}>{children}</div>;
}
