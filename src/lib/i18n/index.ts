import zh from './messages/zh';
import en from './messages/en';

export type Locale = 'zh' | 'en';

const messages: Record<Locale, Record<string, string>> = { zh, en };

function readStoredLocale(): Locale {
  if (typeof window === 'undefined') return 'zh';
  const stored = localStorage.getItem('dash-locale');
  if (stored === 'en' || stored === 'zh') return stored;
  return 'zh';
}

let currentLocale: Locale = readStoredLocale();

export function getLocale(): Locale { return currentLocale; }
export function setLocale(locale: Locale): void {
  currentLocale = locale;
  if (typeof window !== 'undefined') {
    localStorage.setItem('dash-locale', locale);
  }
}

export function t(key: string, params?: Record<string, string | number>): string {
  let text = messages[currentLocale]?.[key] ?? messages.en?.[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}
