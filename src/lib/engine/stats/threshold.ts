const REF_N = 100;

export function adaptiveThreshold(
  baseThreshold: number,
  sampleSize: number,
  minSamples: number = 5,
): number {
  if (sampleSize < minSamples) return Infinity;
  return baseThreshold * Math.sqrt(REF_N / sampleSize);
}
