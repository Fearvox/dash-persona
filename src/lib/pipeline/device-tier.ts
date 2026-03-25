export type DeviceTier = 'high' | 'mid' | 'low';

/** Detect device performance tier based on hardware hints */
export function detectDeviceTier(): DeviceTier {
  if (typeof navigator === 'undefined') return 'mid'; // SSR fallback

  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as { deviceMemory?: number }).deviceMemory ?? 4;

  if (cores >= 10 && memory >= 8) return 'high';
  if (cores >= 4 && memory >= 4) return 'mid';
  return 'low';
}

/** Code art element count per tier */
export const TIER_CONFIG: Record<DeviceTier, { minElements: number; maxElements: number; animationEnabled: boolean }> = {
  high: { minElements: 80, maxElements: 120, animationEnabled: true },
  mid:  { minElements: 30, maxElements: 50,  animationEnabled: true },
  low:  { minElements: 0,  maxElements: 0,   animationEnabled: false },
};
