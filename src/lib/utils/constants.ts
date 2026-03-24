export const PLATFORM_LABELS: Record<string, string> = {
  douyin: 'Douyin',
  tiktok: 'TikTok',
  xhs: 'Red Note',
};

export const VALID_PERSONAS = ['tutorial', 'entertainment', 'lifestyle'] as const;

export function scoreColor(score: number): string {
  if (score >= 70) return 'var(--accent-green)';
  if (score >= 40) return 'var(--accent-yellow)';
  return 'var(--accent-red)';
}
