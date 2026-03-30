/**
 * Hazen plotting position percentile.
 * Fixes tail collapse: never returns exactly 0 or 100.
 * Formula: (rank - 0.5) / N * 100 where rank = count of sorted values <= userValue, clamped to [1, N].
 */
export function empiricalPercentile(userValue: number, sorted: number[]): number {
  const n = sorted.length;
  if (n === 0) return 50;
  let lo = 0, hi = n;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sorted[mid] <= userValue) lo = mid + 1;
    else hi = mid;
  }
  const rank = lo;
  const hazen = ((Math.max(rank, 1) - 0.5) / n) * 100;
  return Math.round(hazen * 10) / 10;
}

export function batchPercentile(values: number[], sorted: number[]): number[] {
  return values.map((v) => empiricalPercentile(v, sorted));
}
