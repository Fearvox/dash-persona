/**
 * Parse Douyin date format "2026年03月15日 10:38" → ISO 8601 string.
 */
export function parseDouyinDate(text: string): string | undefined {
  // Format: "2026年03月15日 10:38" or "2026-03-15 10:38"
  const match = text.match(/(\d{4})[年-](\d{2})[月-](\d{2})日?\s+(\d{2}):(\d{2})/);
  if (!match) return undefined;
  const [, year, month, day, hour, minute] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:00+08:00`;
}

/** Parse numeric string, removing commas. */
export function parseNumber(text: string): number {
  return parseInt(text.replace(/[,，\s]/g, ''), 10) || 0;
}

/** Parse percentage string like "7.09%" → 0.0709 */
export function parsePercent(text: string): number {
  const match = text.match(/([\d.]+)%/);
  return match ? parseFloat(match[1]) / 100 : 0;
}
