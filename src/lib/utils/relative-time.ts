/**
 * Relative time formatting using browser-native Intl.RelativeTimeFormat.
 * Zero external dependencies.
 * @module utils/relative-time
 */

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['week', 7 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];

/**
 * Convert an ISO-8601 timestamp to a locale-aware relative time string.
 *
 * Uses `Intl.RelativeTimeFormat` for natural language output like
 * "3 days ago" or "in 2 hours".
 *
 * @param isoTimestamp - ISO-8601 date string (e.g. "2026-04-01T12:00:00Z")
 * @param locale - BCP 47 locale string (defaults to 'en')
 * @returns Relative time string, or the original timestamp if parsing fails
 */
export function formatRelativeTime(isoTimestamp: string, locale: string = 'en'): string {
  const diff = Date.now() - new Date(isoTimestamp).getTime();
  if (isNaN(diff)) return isoTimestamp;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms) {
      return rtf.format(-Math.round(diff / ms), unit);
    }
  }
  return rtf.format(-Math.round(diff / 1000), 'second');
}

/**
 * Check whether an ISO-8601 timestamp is older than a threshold.
 *
 * @param isoTimestamp - ISO-8601 date string
 * @param thresholdDays - Number of days after which data is considered stale (default: 7)
 * @returns true if the timestamp is older than thresholdDays
 */
export function isStale(isoTimestamp: string, thresholdDays: number = 7): boolean {
  const diff = Date.now() - new Date(isoTimestamp).getTime();
  if (isNaN(diff)) return false;
  return diff > thresholdDays * 24 * 60 * 60 * 1000;
}
